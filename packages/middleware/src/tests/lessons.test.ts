import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { lessonImportSchema } from "@sentence-bank/types";
import { buildApp } from "@/app";

// Schema-level tests use Fastify's `inject` + JSON-schema validation and run without a database.
// The DB round-trip is gated behind RUN_DB_TESTS (needs a live Postgres).

const hagiFixture = JSON.parse(
  readFileSync(new URL("../db/fixtures/hagi-lesson.json", import.meta.url), "utf8"),
);

test("the hagi fixture satisfies the lesson contract", () => {
  const result = lessonImportSchema.safeParse(hagiFixture);
  assert.equal(result.success, true, JSON.stringify(result.error?.issues, null, 2));
});

test("POST /api/lessons/import rejects a payload missing required fields", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/lessons/import",
    payload: {
      slug: "incomplete",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/lessons/import rejects a malformed nested item (generated nested schema is active)", async () => {
  const app = await buildApp();
  // A vocab entry missing its required `yomi` — proves the derived JSON Schema validates children.
  const res = await app.inject({
    method: "POST",
    url: "/api/lessons/import",
    payload: {
      ...hagiFixture,
      vocab: [{
        jp: "宿",
        en: "inn",
        lvl: "N5",
        cat: "lodging",
      }],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test(
  "POST /api/lessons/import then GET round-trips the nested shape and preserves order",
  {
    skip: !process.env.RUN_DB_TESTS,
  },
  async () => {
    const app = await buildApp();
    const slug = `test-lesson-${Date.now()}`;
    const created = await app.inject({
      method: "POST",
      url: "/api/lessons/import",
      payload: {
        ...hagiFixture,
        slug,
      },
    });
    assert.equal(created.statusCode, 201);

    const fetched = await app.inject({
      method: "GET",
      url: `/api/lessons/${slug}`,
    });
    assert.equal(fetched.statusCode, 200);
    const detail = fetched.json();
    assert.equal(detail.vocab.length, hagiFixture.vocab.length);
    assert.equal(detail.vocab[0].jp, hagiFixture.vocab[0].jp);
    assert.equal(detail.source[0].where, hagiFixture.source[0].where);
    assert.deepEqual(
      detail.vocab.map((v: { sortOrder: number }) => v.sortOrder),
      hagiFixture.vocab.map((_: unknown, i: number) => i),
    );

    // A duplicate slug is a 409.
    const dup = await app.inject({
      method: "POST",
      url: "/api/lessons/import",
      payload: {
        ...hagiFixture,
        slug,
      },
    });
    assert.equal(dup.statusCode, 409);

    // The aggregate endpoint includes this lesson's items, tagged with its slug/title.
    const content = await app.inject({
      method: "GET",
      url: "/api/lesson-content",
    });
    assert.equal(content.statusCode, 200);
    const agg = content.json();
    const mine = agg.vocab.filter((v: { lessonSlug: string }) => v.lessonSlug === slug);
    assert.equal(mine.length, hagiFixture.vocab.length);
    assert.equal(mine[0].lessonTitle, hagiFixture.title);
    assert.ok(agg.sentences.some((s: { lessonSlug: string }) => s.lessonSlug === slug));

    // Renshuu annotation persists via PATCH and comes back on the lesson detail.
    const vocabId = detail.vocab[0].id;
    assert.equal(detail.vocab[0].renshuuAdded, false);
    const patched = await app.inject({
      method: "PATCH",
      url: `/api/lesson-vocab/${vocabId}`,
      payload: {
        renshuuAdded: true,
        renshuuList: "Test list",
      },
    });
    assert.equal(patched.statusCode, 200);
    assert.equal(patched.json().renshuuAdded, true);
    const refetched = await app.inject({
      method: "GET",
      url: `/api/lessons/${slug}`,
    });
    const patchedVocab = refetched.json().vocab.find((v: { id: string }) => v.id === vocabId);
    assert.equal(patchedVocab.renshuuAdded, true);
    assert.equal(patchedVocab.renshuuList, "Test list");

    // Cleanup: delete cascades children.
    const del = await app.inject({
      method: "DELETE",
      url: `/api/lessons/${detail.id}`,
    });
    assert.equal(del.statusCode, 204);
    await app.close();
  },
);

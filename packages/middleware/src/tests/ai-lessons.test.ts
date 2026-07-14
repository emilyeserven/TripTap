import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { aiLessonImportSchema } from "@sentence-bank/types";
import { buildApp } from "@/app";

// Schema-level tests use Fastify's `inject` + JSON-schema validation and run without a database.
// The DB round-trip is gated behind RUN_DB_TESTS (needs a live Postgres).

const hagiFixture = JSON.parse(
  readFileSync(new URL("../db/fixtures/hagi-ai-lesson.json", import.meta.url), "utf8"),
);

test("the hagi fixture satisfies the AI Lesson contract", () => {
  const result = aiLessonImportSchema.safeParse(hagiFixture);
  assert.equal(result.success, true, JSON.stringify(result.error?.issues, null, 2));
});

test("POST /api/ai-lessons/import rejects a payload missing required fields", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/ai-lessons/import",
    payload: {
      slug: "incomplete",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/ai-lessons/import rejects a malformed nested item (generated nested schema is active)", async () => {
  const app = await buildApp();
  // A vocab entry missing its required `yomi` — proves the derived JSON Schema validates children.
  const res = await app.inject({
    method: "POST",
    url: "/api/ai-lessons/import",
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

test("PATCH /api/ai-lesson-grammar/:id rejects a malformed grammar term", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/ai-lesson-grammar/00000000-0000-0000-0000-000000000000",
    // Missing the required kind/sourceId/sourceLabel — proves body validation is active.
    payload: {
      grammarTerms: [{
        id: "x",
        name: "y",
      }],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test(
  "POST /api/ai-lessons/import then GET round-trips the nested shape and preserves order",
  {
    skip: !process.env.RUN_DB_TESTS,
  },
  async () => {
    const app = await buildApp();
    const slug = `test-ai-lesson-${Date.now()}`;
    const created = await app.inject({
      method: "POST",
      url: "/api/ai-lessons/import",
      payload: {
        ...hagiFixture,
        slug,
      },
    });
    assert.equal(created.statusCode, 201);

    const fetched = await app.inject({
      method: "GET",
      url: `/api/ai-lessons/${slug}`,
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
      url: "/api/ai-lessons/import",
      payload: {
        ...hagiFixture,
        slug,
      },
    });
    assert.equal(dup.statusCode, 409);

    // The aggregate endpoint includes this AI Lesson's items, tagged with its slug/title.
    const content = await app.inject({
      method: "GET",
      url: "/api/ai-lesson-content",
    });
    assert.equal(content.statusCode, 200);
    const agg = content.json();
    const mine = agg.vocab.filter((v: { aiLessonSlug: string }) => v.aiLessonSlug === slug);
    assert.equal(mine.length, hagiFixture.vocab.length);
    assert.equal(mine[0].aiLessonTitle, hagiFixture.title);
    assert.ok(agg.sentences.some((s: { aiLessonSlug: string }) => s.aiLessonSlug === slug));

    // Renshuu annotation persists via PATCH and comes back on the AI Lesson detail.
    const vocabId = detail.vocab[0].id;
    assert.equal(detail.vocab[0].renshuuAdded, false);
    const patched = await app.inject({
      method: "PATCH",
      url: `/api/ai-lesson-vocab/${vocabId}`,
      payload: {
        renshuuAdded: true,
        renshuuList: "Test list",
      },
    });
    assert.equal(patched.statusCode, 200);
    assert.equal(patched.json().renshuuAdded, true);
    const refetched = await app.inject({
      method: "GET",
      url: `/api/ai-lessons/${slug}`,
    });
    const patchedVocab = refetched.json().vocab.find((v: { id: string }) => v.id === vocabId);
    assert.equal(patchedVocab.renshuuAdded, true);
    assert.equal(patchedVocab.renshuuList, "Test list");

    // Grammar source tags persist via PATCH on both a grammar item and a source sentence.
    const term = {
      id: "gt-1",
      name: "〜ています",
      kind: "tag",
      sourceId: "grammar-src",
      sourceLabel: "Grammar",
      category: "grammar",
    };
    assert.equal(detail.grammar[0].grammarTerms, null);
    const grammarId = detail.grammar[0].id;
    const gPatched = await app.inject({
      method: "PATCH",
      url: `/api/ai-lesson-grammar/${grammarId}`,
      payload: {
        grammarTerms: [term],
      },
    });
    assert.equal(gPatched.statusCode, 200);
    assert.equal(gPatched.json().grammarTerms[0].id, "gt-1");

    const sourceId = detail.source[0].id;
    const sPatched = await app.inject({
      method: "PATCH",
      url: `/api/ai-lesson-source-sentences/${sourceId}`,
      payload: {
        grammarTerms: [term],
      },
    });
    assert.equal(sPatched.statusCode, 200);
    assert.equal(sPatched.json().grammarTerms[0].name, "〜ています");

    // Both come back on the AI Lesson detail.
    const withTags = (await app.inject({
      method: "GET",
      url: `/api/ai-lessons/${slug}`,
    })).json();
    assert.equal(
      withTags.grammar.find((g: { id: string }) => g.id === grammarId).grammarTerms[0].id,
      "gt-1",
    );
    assert.equal(
      withTags.source.find((s: { id: string }) => s.id === sourceId).grammarTerms[0].id,
      "gt-1",
    );

    // An unknown id is a 404.
    const missing = await app.inject({
      method: "PATCH",
      url: "/api/ai-lesson-grammar/00000000-0000-0000-0000-000000000000",
      payload: {
        grammarTerms: [],
      },
    });
    assert.equal(missing.statusCode, 404);

    // Cleanup: delete cascades children.
    const del = await app.inject({
      method: "DELETE",
      url: `/api/ai-lessons/${detail.id}`,
    });
    assert.equal(del.statusCode, 204);
    await app.close();
  },
);

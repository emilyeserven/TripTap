import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// These tests use Fastify's `inject` and JSON-schema validation, so they run without a live database.

test("POST /api/grammar-notes rejects a payload missing tagId", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/grammar-notes",
    payload: {
      tagName: "は",
      title: "は",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/grammar-notes rejects a payload missing title", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/grammar-notes",
    payload: {
      tagId: "tag-1",
      tagName: "は",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/grammar-notes rejects an invalid relation kind", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/grammar-notes",
    payload: {
      tagId: "tag-1",
      tagName: "は",
      title: "は",
      relations: [
        {
          tagId: "tag-2",
          tagName: "が",
          kind: "opposite",
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/grammar-notes accepts a valid payload", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/grammar-notes",
    payload: {
      tagId: "tag-1",
      tagName: "は",
      title: "は",
      nuance: "topic marker",
      summary: "Marks the topic of the sentence.",
      constructions: [
        {
          id: "c1",
          pattern: "〜は〜です",
          note: null,
          sentenceIds: [],
        },
      ],
      relations: [
        {
          tagId: "tag-2",
          tagName: "が",
          kind: "similar",
          note: null,
        },
      ],
      resources: [
        {
          id: "r1",
          title: "Genki I",
          url: null,
          note: "p.42",
        },
      ],
    },
  });
  // Valid payload — 201 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("GET /api/grammar-notes/:id rejects a non-uuid id", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/grammar-notes/not-a-uuid",
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

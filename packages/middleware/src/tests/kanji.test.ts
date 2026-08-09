import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// These tests use Fastify's `inject` and JSON-schema validation, so they run without a live database.
// Endpoints that reach the database are asserted only to be routed and to accept/reject a payload —
// the status is deliberately not pinned to 200.

test("GET /api/kanji is routed (not a 404)", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/kanji",
  });
  assert.notEqual(res.statusCode, 404);
  await app.close();
});

test("GET /api/kanji rejects an unknown sort", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/kanji?sort=bogus",
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("GET /api/kanji rejects an unknown status filter", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/kanji?status=mastered",
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("GET /api/kanji accepts the documented filters", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/kanji?sort=recent&status=learning&kind=vocab&minOccurrences=2",
  });
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("GET /api/kanji/:char is routed with a percent-encoded character", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    // 日, as the client encodes it.
    url: `/api/kanji/${encodeURIComponent("日")}`,
  });
  assert.notEqual(res.statusCode, 404);
  await app.close();
});

test("PUT /api/kanji/:char/status rejects an unknown status", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PUT",
    url: `/api/kanji/${encodeURIComponent("日")}/status`,
    payload: {
      status: "bogus",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("PUT /api/kanji/:char/status accepts a valid payload", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PUT",
    url: `/api/kanji/${encodeURIComponent("日")}/status`,
    payload: {
      status: "known",
      note: "sun / day",
    },
  });
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("the kanji endpoints are documented under the kanji tag", async () => {
  const app = await buildApp();
  await app.ready();
  const spec = app.swagger() as {
    paths: Record<string, Record<string, { tags?: string[] }>>;
  };
  assert.deepEqual(spec.paths["/api/kanji"]?.get?.tags, ["kanji"]);
  assert.deepEqual(spec.paths["/api/kanji/{char}"]?.get?.tags, ["kanji"]);
  assert.deepEqual(spec.paths["/api/kanji/{char}/status"]?.put?.tags, ["kanji"]);
  await app.close();
});

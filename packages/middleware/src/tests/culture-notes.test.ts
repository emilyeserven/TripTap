import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// These tests use Fastify's `inject` and JSON-schema validation, so they run without a live
// database. The at-least-one-body rule is checked in the service before any DB call, so those
// 400s are DB-free too.

test("POST /api/culture-notes rejects a payload with no body in either language", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/culture-notes",
    payload: {},
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/culture-notes rejects titles-only with explicit null bodies", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/culture-notes",
    payload: {
      titleJp: "礼儀",
      titleEn: "Etiquette",
      bodyEn: null,
      bodyJa: null,
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/culture-notes rejects an empty-string body", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/culture-notes",
    payload: {
      bodyJa: "",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/culture-notes rejects an unknown icon key", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/culture-notes",
    payload: {
      bodyEn: "Slurping noodles is fine.",
      icon: "not-an-icon",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/culture-notes rejects a non-uuid topic id", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/culture-notes",
    payload: {
      bodyEn: "Slurping noodles is fine.",
      topicIds: ["not-a-uuid"],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/culture-notes accepts a one-sentence Japanese-only note", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/culture-notes",
    payload: {
      bodyJa: "麺をすするのは失礼ではありません。",
    },
  });
  // Valid payload — 201 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("GET /api/culture-notes/:id rejects a non-uuid id", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/culture-notes/not-a-uuid",
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("PATCH /api/culture-notes/:id rejects a non-uuid id", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/culture-notes/not-a-uuid",
    payload: {
      bodyEn: "Updated.",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/culture-topics rejects a payload missing name", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/culture-topics",
    payload: {},
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/culture-topics rejects an empty name", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/culture-topics",
    payload: {
      name: "",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/culture-topics accepts a valid payload", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/culture-topics",
    payload: {
      name: "Food",
    },
  });
  // Valid payload — 201 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("GET /api/culture-topics/:id rejects a non-uuid id", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/culture-topics/not-a-uuid",
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

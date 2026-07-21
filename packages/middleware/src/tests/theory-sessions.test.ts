import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// These tests use Fastify's `inject` and JSON-schema validation, so they run without a live database.

test("POST /api/theory-sessions rejects a payload missing date", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/theory-sessions",
    payload: {
      entryMode: "pages",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/theory-sessions rejects a payload missing entryMode", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/theory-sessions",
    payload: {
      date: "2026-07-20",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/theory-sessions rejects an unknown entryMode", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/theory-sessions",
    payload: {
      date: "2026-07-20",
      entryMode: "chapters",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/theory-sessions rejects an unknown density", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/theory-sessions",
    payload: {
      date: "2026-07-20",
      entryMode: "pages",
      pages: 3,
      density: "heavy",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/theory-sessions rejects negative pages", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/theory-sessions",
    payload: {
      date: "2026-07-20",
      entryMode: "pages",
      pages: -1,
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/theory-sessions accepts a valid pages payload", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/theory-sessions",
    payload: {
      date: "2026-07-20",
      title: "Genki II ch. 12",
      entryMode: "pages",
      pages: 3,
      density: "medium",
      notesCount: 2,
      notes: "Causative form.",
    },
  });
  // Valid payload — 201 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/theory-sessions accepts a valid words payload", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/theory-sessions",
    payload: {
      date: "2026-07-20",
      entryMode: "words",
      wordCount: 794,
    },
  });
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// These tests use Fastify's `inject` and JSON-schema validation, so they run without a live database.

test("POST /api/drill-sessions rejects a payload missing date", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/drill-sessions",
    payload: {
      title: "Conjugation drills",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/drill-sessions rejects a negative question count", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/drill-sessions",
    payload: {
      date: "2026-07-20",
      questions: -1,
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/drill-sessions rejects an unknown learning area", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/drill-sessions",
    payload: {
      date: "2026-07-20",
      learningArea: "Juggling",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/drill-sessions accepts a question count and a valid learning area", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/drill-sessions",
    payload: {
      date: "2026-07-20",
      questions: 12,
      learningArea: "Vocabulary",
    },
  });
  // Without a live DB the handler fails downstream; schema validation must still pass.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/drill-sessions accepts a valid drill type", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/drill-sessions",
    payload: {
      date: "2026-07-20",
      questions: 12,
      type: "multiple-choice",
    },
  });
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/drill-sessions rejects an unknown drill type", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/drill-sessions",
    payload: {
      date: "2026-07-20",
      type: "essay",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

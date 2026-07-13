import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// These tests use Fastify's `inject` and JSON-schema validation, so they run without a live database.

test("POST /api/writing-prompts rejects a payload missing text", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/writing-prompts",
    payload: {
      textEn: "Describe your morning routine.",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/writing-prompts rejects an empty text", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/writing-prompts",
    payload: {
      text: "",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/writing-prompts rejects an invalid difficulty", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/writing-prompts",
    payload: {
      text: "朝の習慣について書いてください。",
      difficulty: "Expert",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/writing-prompts accepts a valid payload", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/writing-prompts",
    payload: {
      text: "朝の習慣について書いてください。",
      textEn: "Describe your morning routine in the target language.",
      difficulty: "JLPT N5",
    },
  });
  // Valid payload — 201 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/writing-prompts/bulk rejects a payload missing writingPrompts", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/writing-prompts/bulk",
    payload: {
      prompts: [],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/writing-prompts/bulk rejects a non-array payload", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/writing-prompts/bulk",
    payload: {
      writingPrompts: "not an array",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("GET /api/writing-prompts/:id rejects a non-uuid id", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/writing-prompts/not-a-uuid",
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

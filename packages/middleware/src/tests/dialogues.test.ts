import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// These tests use Fastify's `inject` and JSON-schema validation, so they run without a live database.

const VALID = {
  title: "Genki L3 — meeting a coworker",
  language: "Japanese",
  date: "2026-07-20",
  script: "田中さん：こんにちは\n私：はい、元気です。",
};

/** A valid payload with one required field left out. */
function without(field: keyof typeof VALID): Record<string, string> {
  return Object.fromEntries(Object.entries(VALID).filter(([key]) => key !== field));
}

test("POST /api/dialogues rejects a payload missing script", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/dialogues",
    payload: without("script"),
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/dialogues rejects an empty script", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/dialogues",
    payload: {
      ...VALID,
      script: "",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/dialogues rejects a payload missing title", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/dialogues",
    payload: without("title"),
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/dialogues rejects a malformed date", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/dialogues",
    payload: {
      ...VALID,
      date: "not-a-date",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/dialogues rejects an unknown learning area", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/dialogues",
    payload: {
      ...VALID,
      countsTowardXp: true,
      learningArea: "Chatting",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/dialogues accepts a full valid payload", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/dialogues",
    payload: {
      ...VALID,
      selfSpeakers: ["エミリー"],
      countsTowardXp: true,
      learningArea: "Speaking",
      lines: [
        {
          id: "l1",
          speaker: "田中さん",
          text: "こんにちは",
          translation: "Hello",
          reading: [{
            t: "こんにちは",
            r: null,
          }],
          readingError: null,
        },
      ],
    },
  });
  // No database in this suite, so the insert fails after validation — the point is that the payload
  // itself was accepted.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("GET /api/dialogues/:id rejects a non-uuid id", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/dialogues/not-a-uuid",
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

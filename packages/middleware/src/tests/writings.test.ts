import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// These tests use Fastify's `inject` and JSON-schema validation, so they run without a live database.

test("POST /api/writings rejects a payload missing language", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/writings",
    payload: {
      text: "今日は寒いです。",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/writings rejects a terms entry with an unknown category", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/writings",
    payload: {
      text: "今日は寒いです。",
      language: "Japanese",
      terms: [
        {
          id: "t1",
          name: "尊敬語",
          kind: "taxonomy",
          sourceId: "s1",
          sourceLabel: "Grammar",
          category: "politeness",
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/writings rejects a correction entry missing required fields", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/writings",
    payload: {
      text: "今日は寒いです。",
      language: "Japanese",
      corrections: [
        {
          id: "c1",
          original: "今日は寒いです。",
          // corrected omitted → invalid
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/writings accepts a valid payload with tags and a correction", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/writings",
    payload: {
      text: "今日は寒いですから、コートを着ます。",
      language: "Japanese",
      meaning: "It's cold today, so I'll wear a coat.",
      comments: "Practicing ～から.",
      readyToReview: true,
      terms: [
        {
          id: "t1",
          name: "～から",
          kind: "taxonomy",
          sourceId: "s1",
          sourceLabel: "Grammar",
          category: "grammar",
        },
      ],
      corrections: [
        {
          id: "c1",
          original: "今日は寒いです。",
          corrected: "今日は寒いですね。",
          note: "Softer with ね.",
          mySentenceId: null,
        },
      ],
    },
  });
  // Valid payload — 201 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

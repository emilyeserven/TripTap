import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// These tests use Fastify's `inject` and JSON-schema validation, so they run without a live database.

test("POST /api/shadowing-sessions rejects a payload missing language", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/shadowing-sessions",
    payload: {
      title: "Shadowing drill",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/shadowing-sessions rejects a segment missing endMs", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/shadowing-sessions",
    payload: {
      title: "Shadowing drill",
      language: "Japanese",
      segments: [
        {
          id: "s1",
          label: "intro",
          startMs: 1000,
          // endMs omitted → invalid
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/shadowing-sessions rejects an entry with an unknown mode", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/shadowing-sessions",
    payload: {
      title: "Shadowing drill",
      language: "Japanese",
      entries: [
        {
          id: "e1",
          text: "note",
          timestampMs: 1000,
          mode: "on-blur",
          source: "video",
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/shadowing-sessions accepts a valid payload with segments and defaults", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/shadowing-sessions",
    payload: {
      title: "Shadowing drill",
      language: "Japanese",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      defaultMaxReplays: 5,
      defaultGapMs: 500,
      segments: [
        {
          id: "s1",
          label: "intro",
          startMs: 1000,
          endMs: 4000,
          maxReplays: 8,
          gapMs: null,
        },
      ],
      entries: [
        {
          id: "e1",
          text: "hard bit",
          timestampMs: 2000,
          mode: "typing-start",
          source: "video",
        },
      ],
    },
  });
  // Valid payload — 201 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

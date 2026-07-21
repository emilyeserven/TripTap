import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// These tests use Fastify's `inject` and JSON-schema validation, so they run without a live database.

test("POST /api/listening-sessions rejects a payload missing language", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/listening-sessions",
    payload: {
      title: "Terrace House ep. 1",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/listening-sessions rejects an entry with an unknown mode", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/listening-sessions",
    payload: {
      title: "Terrace House ep. 1",
      language: "Japanese",
      entries: [
        {
          id: "e1",
          text: "new word here",
          timestampMs: 12000,
          mode: "on-blur",
          source: "video",
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/listening-sessions rejects a terms entry with an unknown category", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/listening-sessions",
    payload: {
      title: "Terrace House ep. 1",
      language: "Japanese",
      terms: [
        {
          id: "t1",
          name: "ながら",
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

test("POST /api/listening-sessions accepts a valid payload with an entry and a term", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/listening-sessions",
    payload: {
      title: "Terrace House ep. 1",
      language: "Japanese",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      bookmarkId: "bm1",
      bookmarkTitle: "Terrace House",
      bookmarkUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      entries: [
        {
          id: "e1",
          text: "そうなんだ",
          timestampMs: 12345,
          mode: "submit",
          source: "video",
        },
      ],
      terms: [
        {
          id: "t1",
          name: "リスニング",
          kind: "tag",
          sourceId: "s1",
          sourceLabel: "Resources",
          category: "resource",
        },
      ],
    },
  });
  // Valid payload — 201 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/listening-sessions accepts a passive session with a duration", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/listening-sessions",
    payload: {
      title: "Podcast on the commute",
      language: "Japanese",
      passive: true,
      durationMinutes: 45,
    },
  });
  // Valid payload — 201 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/listening-sessions rejects a negative duration", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/listening-sessions",
    payload: {
      title: "Bad",
      language: "Japanese",
      passive: true,
      durationMinutes: -5,
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/listening-sessions accepts a kana entry carrying English context", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/listening-sessions",
    payload: {
      title: "Terrace House ep. 1",
      language: "Japanese",
      entries: [
        {
          id: "e1",
          text: "そうなんだ",
          context: "I see / is that so",
          timestampMs: 12345,
          mode: "typing-start",
          source: "video",
        },
      ],
    },
  });
  // The optional `context` field is part of the schema, so this must not be rejected.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

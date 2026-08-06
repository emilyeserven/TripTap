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
          hint: "greet him and ask how he is",
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

test("POST /api/dialogues accepts a resource bookmark with a section", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/dialogues",
    payload: {
      ...VALID,
      bookmarkId: "bm-1",
      bookmarkTitle: "Genki I",
      bookmarkUrl: "https://example.com/genki",
      section: {
        id: "s1",
        label: "Ch. 3 › Dialogue",
        type: "page",
        startValue: "42",
        endValue: null,
      },
    },
  });
  // No database in this suite, so the insert fails after validation — the point is that the payload
  // itself was accepted.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/dialogues accepts explicit nulls for the resource fields", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/dialogues",
    payload: {
      ...VALID,
      bookmarkId: null,
      bookmarkTitle: null,
      bookmarkUrl: null,
      section: null,
    },
  });
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/dialogues rejects a section with an unknown type", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/dialogues",
    payload: {
      ...VALID,
      section: {
        id: "s1",
        label: "Ch. 3",
        type: "chapter",
      },
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/dialogues rejects a bookmarkId that isn't text", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/dialogues",
    payload: {
      ...VALID,
      // An object can't be coerced to a string, unlike a bare number.
      bookmarkId: {
        nested: "object",
      },
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("PATCH /api/dialogues/:id accepts clearing the section", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/dialogues/6f9619ff-8b86-4d01-b42d-00c04fc964ff",
    payload: {
      section: null,
    },
  });
  // The update body inherits the resource fields from the create body; without a database the
  // lookup fails after validation, so anything but 400 proves the schema accepted it.
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

test("POST /api/dialogues rejects a hint that isn't text", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/dialogues",
    payload: {
      ...VALID,
      lines: [
        {
          id: "l1",
          speaker: "私",
          text: "はい",
          hint: {
            nested: "object",
          },
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

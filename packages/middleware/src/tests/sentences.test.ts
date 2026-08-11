import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// These tests use Fastify's `inject` and JSON-schema validation, so they run without a live database.

test("GET /healthz returns ok", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/healthz",
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), {
    status: "ok",
  });
  await app.close();
});

test("POST /api/sentences rejects a payload missing required fields", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/sentences",
    payload: {
      text: "毎朝コーヒーを飲みます。",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/sentences rejects a terms entry with a missing field", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/sentences",
    payload: {
      text: "毎朝コーヒーを飲みます。",
      language: "Japanese",
      terms: [
        {
          id: "t1",
          name: "Routine",
          kind: "taxonomy",
          // sourceId + sourceLabel omitted → invalid
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/sentences rejects a terms entry with an unknown kind", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/sentences",
    payload: {
      text: "毎朝コーヒーを飲みます。",
      language: "Japanese",
      terms: [
        {
          id: "t1",
          name: "Routine",
          kind: "folder",
          sourceId: "s1",
          sourceLabel: "Genres",
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/sentences accepts a terms entry tagged with a channel category", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/sentences",
    payload: {
      text: "召し上がってください。",
      language: "Japanese",
      terms: [
        {
          id: "t1",
          name: "尊敬語",
          kind: "taxonomy",
          sourceId: "s1",
          sourceLabel: "Grammar",
          category: "grammar",
        },
      ],
    },
  });
  // Valid payload — 200 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/sentences rejects a terms entry with an unknown category", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/sentences",
    payload: {
      text: "召し上がってください。",
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

test("POST /api/sentences accepts a terms entry that omits category (backward compatible)", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/sentences",
    payload: {
      text: "毎朝コーヒーを飲みます。",
      language: "Japanese",
      terms: [
        {
          id: "t1",
          name: "Routine",
          kind: "taxonomy",
          sourceId: "s1",
          sourceLabel: "Genres",
        },
      ],
    },
  });
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

/* ── Unified-table surface: kind, facets, filters, import ────────────────────────────────────────── */

test("POST /api/sentences rejects an unknown kind", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/sentences",
    payload: {
      text: "毎朝コーヒーを飲みます。",
      language: "Japanese",
      kind: "archive",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/sentences accepts a mine-kind payload with its facet fields", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/sentences",
    payload: {
      kind: "mine",
      text: "昨日映画を見ました。",
      language: "Japanese",
      actualMeaning: "I watched a movie yesterday.",
      explanation: "Particle choice was fine here.",
      marks: [
        {
          start: 0,
          end: 2,
          correct: true,
        },
      ],
    },
  });
  // Valid payload — 201 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/sentences accepts a practice-kind payload with its facet fields", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/sentences",
    payload: {
      kind: "practice",
      text: "頭も痛いし、熱もあるし。",
      language: "Japanese",
      target: "〜し〜し",
      targetKind: "grammar",
      comprehension: "studying",
      words: [
        {
          w: "頭",
          r: "あたま",
          m: "head",
        },
      ],
      passes: {
        read: true,
        guess: "2026-01-05T10:00:00.000Z",
      },
    },
  });
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/sentences rejects an unknown targetKind", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/sentences",
    payload: {
      kind: "practice",
      text: "頭も痛いし、熱もあるし。",
      language: "Japanese",
      targetKind: "particle",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("GET /api/sentences accepts kind filters, single and comma-separated", async () => {
  const app = await buildApp();
  for (const kind of ["mine", "bank,practice"]) {
    const res = await app.inject({
      method: "GET",
      url: `/api/sentences?kind=${kind}`,
    });
    assert.notEqual(res.statusCode, 400);
  }
  await app.close();
});

test("GET /api/sentences rejects an unknown kind filter", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/sentences?kind=archive",
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("GET /api/sentences accepts the lineage and state filters", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/sentences?derivedFromId=6f1f2f60-0000-4000-8000-000000000000&needsCorrection=true&shadowingCandidate=false",
  });
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("PATCH /api/sentences/:id accepts a kind flip", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/sentences/6f1f2f60-0000-4000-8000-000000000000",
    payload: {
      kind: "bank",
    },
  });
  // Valid body — 200/404 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/sentences/import strips stray keys rather than 400ing", async () => {
  // Strictness is the *client's* job (`sentenceImportSchema.safeParse` on the paste); the server's
  // Ajv is configured to strip unknown keys, so a stray key must not fail the request.
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/sentences/import",
    payload: {
      text: "頭も痛いし、熱もあるし。",
      vibe: "complaint",
    },
  });
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/sentences/import accepts a full breakdown payload", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/sentences/import",
    payload: {
      text: "頭も痛いし、熱もあるし。",
      readingNote: "あたま・いた・ねつ",
      translation: "My head hurts, and I have a fever too.",
      target: "〜し〜し",
      targetKind: "grammar",
      guess: "Complaining about being sick",
      literal: "Head hurts-and, fever exists-and.",
      register: "casual",
      nuance: "Trailing し leaves the complaint list open.",
      words: [
        {
          w: "熱",
          r: "ねつ",
          m: "fever",
        },
      ],
      grammar: [
        {
          p: "〜も〜し",
          n: "stacks reasons/complaints",
        },
      ],
    },
  });
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

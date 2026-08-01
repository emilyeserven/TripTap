import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// These tests use Fastify's `inject` and JSON-schema validation, so they run without a live database.

test("POST /api/my-sentences rejects a payload missing required fields", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/my-sentences",
    payload: {
      text: "私の文。",
      // language omitted → invalid
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/my-sentences rejects a non-uuid practiceSentenceId", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/my-sentences",
    payload: {
      text: "私の文。",
      language: "Japanese",
      practiceSentenceId: "not-a-uuid",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/my-sentences rejects a malformed term", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/my-sentences",
    payload: {
      text: "私の文。",
      language: "Japanese",
      terms: [
        {
          id: "t1",
          name: "食べる",
          kind: "not-a-kind", // invalid enum → 400
          sourceId: "s1",
          sourceLabel: "Verbs",
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/my-sentences/bulk rejects a payload missing mySentences", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/my-sentences/bulk",
    payload: {},
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/my-sentences/bulk rejects an entry missing language", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/my-sentences/bulk",
    payload: {
      mySentences: [
        {
          text: "私の文。",
          // language omitted → invalid
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("PUT /api/practice-sentences/:id/vocab rejects a non-uuid vocab id", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PUT",
    url: "/api/practice-sentences/11111111-1111-1111-1111-111111111111/vocab",
    payload: {
      vocabIds: ["not-a-uuid"],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/my-sentences accepts a valid marks array", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/my-sentences",
    payload: {
      text: "週末に映画を見った。",
      language: "Japanese",
      marks: [{
        start: 5,
        end: 7,
        correct: false,
      }],
    },
  });
  // Valid payload — 201 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/my-sentences rejects a malformed mark", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/my-sentences",
    payload: {
      text: "私の文。",
      language: "Japanese",
      marks: [{
        start: "x",
        end: 2,
        correct: false,
      }], // start must be an integer
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/my-sentences accepts incorrectGrammarTerms", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/my-sentences",
    payload: {
      text: "電気が消しました",
      language: "Japanese",
      incorrectGrammarTerms: [{
        id: "g1",
        name: "transitivity",
        kind: "tag",
        sourceId: "s1",
        sourceLabel: "Grammar",
        category: "grammar",
      }],
    },
  });
  // Without a DB the insert can't complete, but schema validation must accept the field.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/my-sentences rejects an incorrectGrammarTerms entry missing its id", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/my-sentences",
    payload: {
      text: "x",
      language: "Japanese",
      incorrectGrammarTerms: [{
        name: "no id",
        kind: "tag",
        sourceId: "s1",
        sourceLabel: "Grammar",
      }],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

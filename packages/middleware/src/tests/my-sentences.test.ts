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

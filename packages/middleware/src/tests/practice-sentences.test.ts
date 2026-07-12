import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// These tests use Fastify's `inject` and JSON-schema validation, so they run without a live database.

test("POST /api/practice-sentences rejects a payload missing required fields", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/practice-sentences",
    payload: {
      text: "バイトも休めないし、マジで頭が痛い。",
      // language omitted → invalid
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/practice-sentences rejects an unknown comprehension bucket", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/practice-sentences",
    payload: {
      text: "バイトも休めないし、マジで頭が痛い。",
      language: "Japanese",
      comprehension: "mostly", // not in the allowed enum
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/practice-sentences rejects an unknown target kind", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/practice-sentences",
    payload: {
      text: "バイトも休めないし、マジで頭が痛い。",
      language: "Japanese",
      targetKind: "phrase", // not in the allowed enum
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/practice-sentences rejects a word entry with a missing field", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/practice-sentences",
    payload: {
      text: "バイトも休めないし、マジで頭が痛い。",
      language: "Japanese",
      words: [
        {
          w: "頭",
          r: "あたま",
          // m omitted → invalid
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/practice-sentences/bulk rejects a non-array payload", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/practice-sentences/bulk",
    payload: {
      practiceSentences: {
        text: "x",
        language: "Japanese",
      },
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

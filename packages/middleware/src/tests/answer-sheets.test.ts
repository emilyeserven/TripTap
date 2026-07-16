import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// These tests use Fastify's `inject` and JSON-schema validation, so they run without a live database.

test("POST /api/answer-sheets rejects a payload missing questionSheetId", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/answer-sheets",
    payload: {
      title: "Attempt 1",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/answer-sheets rejects a non-uuid questionSheetId", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/answer-sheets",
    payload: {
      questionSheetId: "not-a-uuid",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/answer-sheets rejects an entry missing required fields", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/answer-sheets",
    payload: {
      questionSheetId: "11111111-1111-1111-1111-111111111111",
      entries: [{
        slotId: "q1",
      }], // value omitted → invalid
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/answer-sheets accepts a valid payload with answers and a correction", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/answer-sheets",
    payload: {
      questionSheetId: "11111111-1111-1111-1111-111111111111",
      title: "Genki L3 workbook — attempt 1",
      entries: [
        {
          slotId: "q1:0",
          value: "食べます",
          correct: true,
          correction: null,
          reasoning: null,
          intendedMeaning: null,
          actualMeaning: null,
        },
        {
          slotId: "q2",
          value: "週末に映画を見った。",
          correct: false,
          correction: "週末に映画を見た。",
          reasoning: "見る is ichidan, so the past tense is 見た, not 見った.",
          intendedMeaning: "I watched a movie over the weekend.",
          actualMeaning: "(ungrammatical)",
        },
      ],
    },
  });
  // Valid payload — 201 with a DB, or a 5xx (FK) without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/answer-sheets accepts a payload with an assigned date", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/answer-sheets",
    payload: {
      questionSheetId: "11111111-1111-1111-1111-111111111111",
      title: "Dated attempt",
      date: "2026-07-15T00:00:00.000Z",
      entries: [],
    },
  });
  // Valid payload — 201 with a DB, or a 5xx (FK) without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/answer-sheets rejects a non-string date", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/answer-sheets",
    payload: {
      questionSheetId: "11111111-1111-1111-1111-111111111111",
      date: ["2026-07-15"], // must be a string or null, not an array
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("GET /api/answer-sheets accepts a uuid questionSheetId filter", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/answer-sheets?questionSheetId=11111111-1111-1111-1111-111111111111",
  });
  // Valid querystring — 200 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("GET /api/answer-sheets rejects a non-uuid questionSheetId filter", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/answer-sheets?questionSheetId=not-a-uuid",
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/answer-sheets rejects an entry with a malformed mark", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/answer-sheets",
    payload: {
      questionSheetId: "11111111-1111-1111-1111-111111111111",
      entries: [
        {
          slotId: "q1",
          value: "食べます",
          marks: [{
            start: 0,
            end: 2,
            correct: "yes",
          }], // correct must be a boolean
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

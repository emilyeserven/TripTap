import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// These tests use Fastify's `inject` and JSON-schema validation, so they run without a live database.

test("POST /api/question-sheets rejects a payload missing title", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/question-sheets",
    payload: {
      layout: "list",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/question-sheets rejects an unknown layout", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/question-sheets",
    payload: {
      title: "Chapter 3 drills",
      layout: "matrix",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/question-sheets rejects a question missing a prompt", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/question-sheets",
    payload: {
      title: "Chapter 3 drills",
      layout: "list",
      questions: [{
        id: "q1",
      }],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/question-sheets rejects a non-string bookmarkId", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/question-sheets",
    payload: {
      title: "Chapter 3 drills",
      layout: "list",
      bookmarkId: {
        id: "b1",
      },
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/question-sheets accepts a valid list sheet with parts, a bookmark, and a due date", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/question-sheets",
    payload: {
      title: "Genki L3 workbook",
      layout: "list",
      notes: "Section II",
      bookmarkId: "b1",
      bookmarkTitle: "Genki I — Lesson 3",
      bookmarkUrl: "https://example.com/genki-l3",
      dueDate: "2026-08-01T00:00:00.000Z",
      questions: [
        {
          id: "q1",
          prompt: "Translate the following.",
          parts: [{
            id: "p1",
            label: "(a)",
          }, {
            id: "p2",
            label: "(b)",
          }],
        },
        {
          id: "q2",
          prompt: "Write a short paragraph about your weekend.",
        },
      ],
    },
  });
  // Valid payload — 201 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/question-sheets accepts a valid grid sheet", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/question-sheets",
    payload: {
      title: "Verb conjugation table",
      layout: "grid",
      grid: {
        columns: ["dictionary", "ます", "て", "ない"],
        rows: [{
          id: "r1",
          label: "食べる",
        }, {
          id: "r2",
          label: "飲む",
        }],
      },
    },
  });
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

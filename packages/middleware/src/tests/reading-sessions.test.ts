import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// These tests use Fastify's `inject` and JSON-schema validation, so they run without a live database.

test("POST /api/reading-sessions rejects a payload missing language", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/reading-sessions",
    payload: {
      title: "Chapter 3",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/reading-sessions rejects a payload missing date", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/reading-sessions",
    payload: {
      title: "Chapter 3",
      language: "Japanese",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/reading-sessions rejects an unknown mode", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/reading-sessions",
    payload: {
      title: "Chapter 3",
      language: "Japanese",
      mode: "paraphrase",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/reading-sessions rejects a word note with an unknown status", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/reading-sessions",
    payload: {
      title: "Chapter 3",
      language: "Japanese",
      wordNotes: [
        {
          id: "w1",
          word: "難しい",
          status: "forgot",
          flashcard: true,
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/reading-sessions accepts a valid line-by-line payload with lines and word notes", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/reading-sessions",
    payload: {
      title: "Chapter 3",
      language: "Japanese",
      date: "2026-07-20",
      mode: "line-by-line",
      page: "p. 12–13",
      lines: [
        {
          id: "l1",
          text: "猫が座っている。",
          translation: "The cat is sitting.",
          summaryOnly: false,
          correction: null,
          needsCorrection: false,
        },
        {
          id: "l2",
          text: "長い段落…",
          translation: "The narrator reflects on the day.",
          summaryOnly: true,
          correction: null,
          needsCorrection: false,
        },
      ],
      wordNotes: [
        {
          id: "w1",
          word: "座る",
          reading: "すわる",
          meaning: "to sit",
          status: "shaky",
          flashcard: true,
        },
        {
          id: "w2",
          word: "段落",
          reading: null,
          meaning: null,
          status: "unknown",
          flashcard: false,
        },
      ],
    },
  });
  // Valid payload — 201 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/reading-sessions accepts a valid freeform payload", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/reading-sessions",
    payload: {
      title: "News article",
      language: "Japanese",
      date: "2026-07-20",
      mode: "freeform",
      passage: "本文…",
      freeformTranslation: "My translation of the whole passage.",
      summary: "A short article about the weather.",
    },
  });
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/reading-sessions accepts an attached bookmark resource + section", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/reading-sessions",
    payload: {
      title: "Read \"Day 1\" of 初級読解",
      language: "Japanese",
      date: "2026-07-20",
      bookmarkId: "bk-1",
      bookmarkTitle: "初級読解",
      bookmarkUrl: null,
      section: {
        id: "sec-1",
        label: "Day 1",
        type: "page",
        startValue: "1",
        endValue: null,
      },
    },
  });
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

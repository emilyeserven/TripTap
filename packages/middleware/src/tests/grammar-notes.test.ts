import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// These tests use Fastify's `inject` and JSON-schema validation, so they run without a live database.

test("POST /api/grammar-notes rejects a payload missing tagId", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/grammar-notes",
    payload: {
      tagName: "は",
      title: "は",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/grammar-notes rejects a payload missing title", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/grammar-notes",
    payload: {
      tagId: "tag-1",
      tagName: "は",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/grammar-notes rejects an invalid relation kind", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/grammar-notes",
    payload: {
      tagId: "tag-1",
      tagName: "は",
      title: "は",
      relations: [
        {
          tagId: "tag-2",
          tagName: "が",
          kind: "opposite",
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/grammar-notes accepts a valid payload", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/grammar-notes",
    payload: {
      tagId: "tag-1",
      tagName: "は",
      title: "は",
      nuance: "topic marker",
      summary: "Marks the topic of the sentence.",
      constructions: [
        {
          id: "c1",
          pattern: "〜は〜です",
          note: null,
          sentenceIds: [],
        },
      ],
      relations: [
        {
          tagId: "tag-2",
          tagName: "が",
          kind: "similar",
          note: null,
        },
      ],
      resources: [
        {
          id: "r1",
          title: "Genki I",
          url: null,
          note: "p.42",
        },
      ],
    },
  });
  // Valid payload — 201 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/grammar-notes accepts a block-based construction", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/grammar-notes",
    payload: {
      tagId: "tag-1",
      tagName: "の",
      title: "の",
      constructions: [
        {
          id: "c1",
          pattern: "Adj(Short)/Verb(Short) + Noun",
          meaning: "A [Noun] who is [Adj/Verb]",
          slots: [
            {
              id: "s1",
              alternatives: [
                {
                  id: "a1",
                  label: "Adj",
                  forms: ["Short"],
                },
                {
                  id: "a2",
                  label: "Verb",
                  forms: ["Short", "Polite"],
                  term: {
                    id: "term-1",
                    name: "Verb conjugation",
                    kind: "tag",
                    sourceId: "src-1",
                    sourceLabel: "Grammar",
                    category: "grammar",
                  },
                },
              ],
            },
            {
              id: "s2",
              alternatives: [
                {
                  id: "a3",
                  label: "Noun",
                  forms: [],
                  literal: false,
                },
              ],
            },
          ],
          note: null,
          sentenceIds: [],
        },
      ],
    },
  });
  // Valid payload — 201 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/grammar-notes accepts a construction without sentenceIds", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/grammar-notes",
    payload: {
      tagId: "tag-1",
      tagName: "の",
      title: "の",
      constructions: [
        {
          id: "c1",
          pattern: "Noun + の + Noun",
          note: null,
        },
      ],
    },
  });
  // Valid payload — 201 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("PATCH /api/grammar-notes/:id accepts a construction without sentenceIds", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/grammar-notes/6f2d2c7e-1111-4222-8333-444455556666",
    payload: {
      constructions: [
        {
          id: "c1",
          pattern: "〜ないといけない",
          note: null,
        },
      ],
    },
  });
  // Valid payload — 200/404 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/grammar-notes rejects an alternative missing label", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/grammar-notes",
    payload: {
      tagId: "tag-1",
      tagName: "の",
      title: "の",
      constructions: [
        {
          id: "c1",
          pattern: "",
          slots: [
            {
              id: "s1",
              alternatives: [
                {
                  id: "a1",
                  forms: [],
                },
              ],
            },
          ],
          note: null,
          sentenceIds: [],
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/grammar-notes rejects a slot missing alternatives", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/grammar-notes",
    payload: {
      tagId: "tag-1",
      tagName: "の",
      title: "の",
      constructions: [
        {
          id: "c1",
          pattern: "",
          slots: [
            {
              id: "s1",
            },
          ],
          note: null,
          sentenceIds: [],
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/grammar-notes rejects an invalid term kind", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/grammar-notes",
    payload: {
      tagId: "tag-1",
      tagName: "の",
      title: "の",
      constructions: [
        {
          id: "c1",
          pattern: "",
          slots: [
            {
              id: "s1",
              alternatives: [
                {
                  id: "a1",
                  label: "Verb",
                  forms: [],
                  term: {
                    id: "term-1",
                    name: "Verb conjugation",
                    kind: "folder",
                    sourceId: "src-1",
                    sourceLabel: "Grammar",
                  },
                },
              ],
            },
          ],
          note: null,
          sentenceIds: [],
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("PATCH /api/grammar-notes/:id accepts constructions with slots", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/grammar-notes/6f2d2c7e-1111-4222-8333-444455556666",
    payload: {
      constructions: [
        {
          id: "c1",
          pattern: "Noun + の + Noun",
          meaning: "[Noun]'s [Noun]",
          slots: [
            {
              id: "s1",
              alternatives: [
                {
                  id: "a1",
                  label: "Noun",
                  forms: [],
                },
              ],
            },
            {
              id: "s2",
              alternatives: [
                {
                  id: "a2",
                  label: "の",
                  forms: [],
                  literal: true,
                },
              ],
            },
          ],
          note: null,
          sentenceIds: [],
        },
      ],
    },
  });
  // Valid payload — 200/404 with a DB, or a 5xx without one, but never a 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("GET /api/grammar-notes/:id rejects a non-uuid id", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/grammar-notes/not-a-uuid",
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

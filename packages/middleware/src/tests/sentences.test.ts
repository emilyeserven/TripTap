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

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

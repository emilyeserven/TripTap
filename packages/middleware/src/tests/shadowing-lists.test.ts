import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// These tests use Fastify's `inject` and JSON-schema validation, so they run without a live database.

test("POST /api/shadowing-lists rejects a payload missing name", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/shadowing-lists",
    payload: {
      notes: "no name here",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/shadowing-lists rejects a non-uuid in sentenceIds", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/shadowing-lists",
    payload: {
      name: "Morning drill",
      sentenceIds: ["not-a-uuid"],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/shadowing-lists accepts a valid payload (not rejected as invalid)", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/shadowing-lists",
    payload: {
      name: "Morning drill",
      notes: "warm-up sentences",
      sentenceIds: ["11111111-1111-1111-1111-111111111111"],
    },
  });
  // Without a DB the insert may fail (500), but the JSON Schema must not reject a valid body as 400.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("GET /api/shadowing-lists/:id rejects a non-uuid id", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/shadowing-lists/not-a-uuid",
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

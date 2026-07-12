import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// Schema-validation tests for the capture routes — they run without a live database because
// Fastify validates params/body before the handler (and any DB access) runs.

const UUID = "00000000-0000-0000-0000-000000000000";

test("PUT /api/captures/:id/sentences/order rejects a non-uuid capture id", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PUT",
    url: "/api/captures/not-a-uuid/sentences/order",
    payload: {
      sentenceIds: [UUID],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("PUT /api/captures/:id/sentences/order requires a sentenceIds array", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PUT",
    url: `/api/captures/${UUID}/sentences/order`,
    payload: {},
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("PUT /api/captures/:id/sentences/order rejects non-uuid sentence ids", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PUT",
    url: `/api/captures/${UUID}/sentences/order`,
    payload: {
      sentenceIds: ["nope"],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";
import { isValidDateRange } from "@/utils/dates";

// These tests use Fastify's `inject` and pure helpers, so they run without a live database.

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

test("POST /api/trips rejects a payload missing required fields", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/trips",
    payload: {
      name: "x",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/trips rejects an inverted date range", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/trips",
    payload: {
      name: "Backwards trip",
      destination: "Nowhere",
      startDate: "2026-07-10",
      endDate: "2026-07-01",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("isValidDateRange validates ordering and parseability", () => {
  assert.equal(isValidDateRange("2026-07-01", "2026-07-10"), true);
  assert.equal(isValidDateRange("2026-07-10", "2026-07-01"), false);
  assert.equal(isValidDateRange("not-a-date", "2026-07-01"), false);
});

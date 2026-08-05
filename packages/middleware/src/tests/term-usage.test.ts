import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// These tests use Fastify's `inject` and JSON-schema validation, so they run without a live database.

test("GET /api/terms/:id/usages is routed (not a 404)", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/terms/tag-123/usages",
  });
  // Without a database the handler errors at query time; what matters here is that the route exists
  // and accepts a bookmarks term id, which is an opaque string rather than a local uuid.
  assert.notEqual(res.statusCode, 404);
  await app.close();
});

test("GET /api/terms/:id/usages appears in the OpenAPI document under the terms tag", async () => {
  const app = await buildApp();
  await app.ready();
  const spec = app.swagger() as {
    paths: Record<string, Record<string, { tags?: string[] }>>;
  };
  const operation = spec.paths["/api/terms/{id}/usages"]?.get;
  assert.ok(operation, "expected the term-usage endpoint to be documented");
  assert.deepEqual(operation.tags, ["terms"]);
  await app.close();
});

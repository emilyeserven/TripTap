import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildApp } from "@/app";

/**
 * A committed snapshot of the whole generated OpenAPI document.
 *
 * The route schemas *are* the API contract: they decide what a request may contain, what Ajv
 * strips, and what `/docs` publishes. Nothing guarded them, so a refactor of the route layer could
 * quietly change the contract and every test would still pass — the endpoint tests assert status
 * codes, not shapes.
 *
 * This is the guard. It is deliberately the full document rather than a digest: when it fails, the
 * diff should tell you *what* changed, not merely *that* something did. That makes it the review
 * artifact for any change to a route's schema — including the migration of the hand-written bodies
 * onto Zod, where every nullable field's spelling moves and nothing else should.
 *
 * **When this fails:** read the diff first. If the change is intended, regenerate with
 * `UPDATE_OPENAPI_SNAPSHOT=1 pnpm --filter=@sentence-bank/middleware test` and commit the result.
 * Regenerating without reading the diff defeats the entire point of the file.
 */

const SNAPSHOT = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "openapi.json");

test("the generated OpenAPI document matches the committed snapshot", async () => {
  const app = await buildApp();
  await app.ready();
  const actual = `${JSON.stringify(app.swagger(), null, 2)}\n`;
  await app.close();

  if (process.env.UPDATE_OPENAPI_SNAPSHOT) {
    mkdirSync(dirname(SNAPSHOT), {
      recursive: true,
    });
    writeFileSync(SNAPSHOT, actual);
    return;
  }

  const expected = readFileSync(SNAPSHOT, "utf8");
  assert.equal(
    actual,
    expected,
    "The API surface changed. Read the diff; if it's intended, regenerate with "
    + "UPDATE_OPENAPI_SNAPSHOT=1 and commit the snapshot.",
  );
});

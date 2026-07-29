import assert from "node:assert/strict";
import { test } from "node:test";
import { ruleTagKeyFromLabel } from "@sentence-bank/types";
import { buildApp } from "@/app";

// Schema validation + the pure slug helper run without a database.

test("ruleTagKeyFromLabel slugifies labels and never yields an empty key", () => {
  assert.equal(ruleTagKeyFromLabel("Transitive / intransitive pairs"), "transitive-intransitive-pairs");
  // Unicode-aware: Japanese letters are kept so distinct Japanese labels don't collide.
  assert.equal(ruleTagKeyFromLabel("に vs で (location)"), "に-vs-で-location");
  assert.equal(ruleTagKeyFromLabel("  てform  "), "てform");
  // A label with no letters or numbers at all falls back to the trimmed label.
  assert.equal(ruleTagKeyFromLabel("＋＋"), "＋＋");
});

test("PUT /api/rule-tags rejects a body without a key", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PUT",
    url: "/api/rule-tags",
    payload: {
      label: "No key here",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("GET /api/corrections/grammar-stats requires grammarTagId", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/corrections/grammar-stats",
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

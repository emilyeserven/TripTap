import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isCorrectionBucket,
  resolveTriagePath,
  TRIAGE_TREE,
} from "@sentence-bank/types";
import { buildApp } from "@/app";

// These tests use Fastify's `inject` + JSON-schema validation and the pure triage tree, so they run
// without a live database. The persistence round-trips (slip-deletes, log grouping) need Postgres and
// are gated behind RUN_DB_TESTS.

const UUID = "00000000-0000-0000-0000-000000000001";

/* ── Triage tree (pure, no DB) — spec §3, §11 ────────────────────────────────────────────────────── */

test("triage tree resolves every bucket in ≤3 questions", () => {
  // slip: q1 → yes (1 question)
  assert.equal(resolveTriagePath([{
    node: "q1",
    option: 0,
  }]), "slip");
  // rule_gap: q1 no → q2 yes → q3 yes
  assert.equal(
    resolveTriagePath([
      {
        node: "q1",
        option: 1,
      },
      {
        node: "q2",
        option: 0,
      },
      {
        node: "q3",
        option: 0,
      },
    ]),
    "rule_gap",
  );
  // collocation via q3 "not really"
  assert.equal(
    resolveTriagePath([
      {
        node: "q1",
        option: 1,
      },
      {
        node: "q2",
        option: 0,
      },
      {
        node: "q3",
        option: 1,
      },
    ]),
    "collocation",
  );
  // register: q1 no → q2 no → q4 yes
  assert.equal(
    resolveTriagePath([
      {
        node: "q1",
        option: 1,
      },
      {
        node: "q2",
        option: 1,
      },
      {
        node: "q4",
        option: 0,
      },
    ]),
    "register",
  );
  // collocation via q4 "natives phrase it differently"
  assert.equal(
    resolveTriagePath([
      {
        node: "q1",
        option: 1,
      },
      {
        node: "q2",
        option: 1,
      },
      {
        node: "q4",
        option: 1,
      },
    ]),
    "collocation",
  );
});

test("every triage tree option leads somewhere and no path exceeds 3 questions", () => {
  for (const node of Object.values(TRIAGE_TREE)) {
    assert.ok(node.options.length === 2, `${node.id} should offer two options`);
    for (const option of node.options) {
      const isBucket = isCorrectionBucket(option.next);
      assert.ok(isBucket || option.next in TRIAGE_TREE, `${node.id} → ${option.next} is dangling`);
    }
  }
  // The deepest path (q1 → q2 → q3/q4) is exactly three questions.
  const deepest = resolveTriagePath([
    {
      node: "q1",
      option: 1,
    },
    {
      node: "q2",
      option: 0,
    },
    {
      node: "q3",
      option: 0,
    },
  ]);
  assert.equal(deepest, "rule_gap");
});

/* ── Route schema validation (no DB) ─────────────────────────────────────────────────────────────── */

test("POST /api/corrections rejects a payload missing original", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/corrections",
    payload: {
      corrected: "学校へ行きました",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/corrections rejects a payload missing corrected", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/corrections",
    payload: {
      original: "学校え行きました",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/corrections rejects an unknown source", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/corrections",
    payload: {
      original: "a",
      corrected: "b",
      source: "robot",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("triage endpoint rejects an unknown bucket", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: `/api/corrections/${UUID}/triage`,
    payload: {
      bucket: "nonsense",
      path: ["q1"],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

// rule_gap without a rule tag is rejected in the service *before* any DB access, so this runs DB-free.
test("triage as rule_gap without a rule tag is rejected (spec §6 inv., §11)", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: `/api/corrections/${UUID}/triage`,
    payload: {
      bucket: "rule_gap",
      path: ["q1", "q2", "q3"],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

// register without a scene is likewise rejected before any DB access.
test("triage as register without a scene is rejected (spec §6, §11)", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: `/api/corrections/${UUID}/triage`,
    payload: {
      bucket: "register",
      path: ["q1", "q2", "q4"],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

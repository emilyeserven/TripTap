import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// Schema validation runs without a database. The recurrence-gate round-trip needs Postgres and is
// gated behind RUN_DB_TESTS.

function pair(i: number) {
  return {
    id: `p${i}`,
    a: {
      jp: `A${i}`,
      en: `a${i}`,
    },
    b: {
      jp: `B${i}`,
      en: `b${i}`,
    },
    options: [`o${i}a`, `o${i}b`],
  };
}

function pairs(n: number) {
  return Array.from({
    length: n,
  }, (_, i) => pair(i));
}

test("POST /api/rule-groups rejects fewer than 4 pairs (spec §6 inv.9)", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/rule-groups",
    payload: {
      ruleTagKey: "transitivity",
      axis: "transitive vs intransitive",
      items: pairs(3),
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/rule-groups rejects more than 6 pairs (spec §6 inv.9)", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/rule-groups",
    payload: {
      ruleTagKey: "transitivity",
      axis: "transitive vs intransitive",
      items: pairs(7),
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/rule-groups rejects a pair without both front options (spec §6 inv.4)", async () => {
  const app = await buildApp();
  const bad = pairs(4);
  bad[0].options = ["only-one"] as unknown as [string, string];
  const res = await app.inject({
    method: "POST",
    url: "/api/rule-groups",
    payload: {
      ruleTagKey: "transitivity",
      axis: "transitive vs intransitive",
      items: bad,
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/rule-groups rejects a missing axis (spec §6 inv.10)", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/rule-groups",
    payload: {
      ruleTagKey: "transitivity",
      items: pairs(4),
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

// The recurrence gate blocks a group at 1 strike and allows it at 2 (spec §6 inv.1, §11).
test(
  "a rule group is blocked at occurrence 1 and allowed at 2",
  {
    skip: !process.env.RUN_DB_TESTS,
  },
  async () => {
    const app = await buildApp();
    try {
      const key = `gate-${Date.now()}`;

      // First strike.
      const c1 = await app.inject({
        method: "POST",
        url: "/api/corrections",
        payload: {
          original: "wrote1",
          corrected: "fix1",
        },
      });
      await app.inject({
        method: "POST",
        url: `/api/corrections/${c1.json().id}/triage`,
        payload: {
          bucket: "rule_gap",
          path: ["q1", "q2", "q3"],
          ruleTagKey: key,
        },
      });

      const blocked = await app.inject({
        method: "POST",
        url: "/api/rule-groups",
        payload: {
          ruleTagKey: key,
          axis: "x",
          items: pairs(4),
        },
      });
      assert.equal(blocked.statusCode, 400);

      // Second strike.
      const c2 = await app.inject({
        method: "POST",
        url: "/api/corrections",
        payload: {
          original: "wrote2",
          corrected: "fix2",
        },
      });
      await app.inject({
        method: "POST",
        url: `/api/corrections/${c2.json().id}/triage`,
        payload: {
          bucket: "rule_gap",
          path: ["q1", "q2", "q3"],
          ruleTagKey: key,
        },
      });

      const allowed = await app.inject({
        method: "POST",
        url: "/api/rule-groups",
        payload: {
          ruleTagKey: key,
          axis: "x",
          items: pairs(4),
        },
      });
      assert.equal(allowed.statusCode, 201);
    }
    finally {
      await app.close();
    }
  },
);

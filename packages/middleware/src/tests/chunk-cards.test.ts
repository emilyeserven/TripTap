import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// Schema validation runs without a database. The volume-cap round-trip needs Postgres and is gated
// behind RUN_DB_TESTS.

const BATCH = "00000000-0000-0000-0000-0000000000aa";

test("POST /api/chunk-cards rejects a body missing required fields", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/chunk-cards",
    payload: {
      batchId: BATCH,
      chunk: "お風呂に入る",
      // gloss/format/prompt/answer omitted → invalid
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/chunk-cards rejects an unknown format", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/chunk-cards",
    payload: {
      batchId: BATCH,
      chunk: "お風呂に入る",
      gloss: "take a bath",
      format: "flashcard",
      prompt: "Say you take a bath.",
      answer: "お風呂に入る",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

// The volume cap hard-blocks a 4th card in one batch (spec §6 inv.2, §11).
test(
  "a 4th chunk card in one batch is refused",
  {
    skip: !process.env.RUN_DB_TESTS,
  },
  async () => {
    const app = await buildApp();
    try {
      const batchId = `00000000-0000-0000-0000-${String(Date.now()).slice(-12).padStart(12, "0")}`;
      const body = {
        batchId,
        chunk: "お風呂に入る",
        gloss: "take a bath",
        format: "situation_production" as const,
        prompt: "Say you take a bath.",
        answer: "お風呂に入る",
      };
      for (let i = 0; i < 3; i++) {
        const ok = await app.inject({
          method: "POST",
          url: "/api/chunk-cards",
          payload: body,
        });
        assert.equal(ok.statusCode, 201);
      }
      const fourth = await app.inject({
        method: "POST",
        url: "/api/chunk-cards",
        payload: body,
      });
      assert.equal(fourth.statusCode, 400);
    }
    finally {
      await app.close();
    }
  },
);

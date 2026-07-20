import assert from "node:assert/strict";
import { test } from "node:test";
import type { OcrSettings } from "@sentence-bank/types";
import { buildApp } from "@/app";

// The schema-validation test runs without a database. The persist → masked-read → clear round-trip
// needs a live Postgres, so it is gated behind RUN_DB_TESTS.

test("PATCH /api/settings/ocr rejects a non-string key value", async () => {
  const app = await buildApp();
  // An object can't be coerced to `string | null`, so schema validation rejects it before the
  // handler runs — no database needed.
  const res = await app.inject({
    method: "PATCH",
    url: "/api/settings/ocr",
    payload: {
      ocrSpaceApiKey: {
        nested: true,
      },
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("PATCH /api/settings/profile rejects more than three goals", async () => {
  const app = await buildApp();
  const goal = (id: string) => ({
    id,
    title: `Goal ${id}`,
    notes: null,
    learningAreas: [],
    grammarTerms: [],
    resourceTerms: [],
  });
  const res = await app.inject({
    method: "PATCH",
    url: "/api/settings/profile",
    payload: {
      goals: [goal("g1"), goal("g2"), goal("g3"), goal("g4")],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("PATCH /api/settings/profile rejects a goal missing its title", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/settings/profile",
    payload: {
      goals: [
        {
          id: "g1",
          learningAreas: ["Reading"],
          grammarTerms: [],
          resourceTerms: [],
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("PATCH /api/settings/profile rejects an unknown learning area on a goal", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/settings/profile",
    payload: {
      goals: [
        {
          id: "g1",
          title: "Read more",
          notes: null,
          learningAreas: ["Juggling"],
          grammarTerms: [],
          resourceTerms: [],
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("PATCH /api/settings/profile accepts a full valid goal", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/settings/profile",
    payload: {
      goals: [
        {
          id: "g1",
          title: "Shore up particles",
          notes: "は vs が especially",
          learningAreas: ["Grammar", "Writing"],
          grammarTerms: [
            {
              id: "t1",
              name: "は vs が",
              kind: "tag",
              sourceId: "s1",
              sourceLabel: "Grammar",
              category: "grammar",
            },
          ],
          resourceTerms: [],
        },
      ],
    },
  });
  // Without a live DB the handler fails downstream; schema validation must still pass.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("PATCH /api/settings/xp rejects a negative rate", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/settings/xp",
    payload: {
      rates: {
        shadowingLoop: -0.25,
      },
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("PATCH /api/settings/xp strips unknown rate keys", async () => {
  const app = await buildApp();
  // Fastify's AJV removes additional properties rather than rejecting them, so an unknown key is
  // silently dropped and the request proceeds as if it were absent.
  const res = await app.inject({
    method: "PATCH",
    url: "/api/settings/xp",
    payload: {
      rates: {
        bribingTheTutor: 100,
      },
    },
  });
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("PATCH /api/settings/xp accepts overrides and a full reset", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/settings/xp",
    payload: {
      rates: {
        readingTranslatedSentence: 3,
        drillRound: null,
      },
    },
  });
  // Without a live DB the handler fails downstream; schema validation must still pass.
  assert.notEqual(res.statusCode, 400);
  const reset = await app.inject({
    method: "PATCH",
    url: "/api/settings/xp",
    payload: {
      rates: null,
    },
  });
  assert.notEqual(reset.statusCode, 400);
  await app.close();
});

test(
  "PATCH then GET /api/settings/ocr persists keys and returns only a masked view",
  {
    skip: !process.env.RUN_DB_TESTS,
  },
  async () => {
    const app = await buildApp();
    try {
      const stored = await app.inject({
        method: "PATCH",
        url: "/api/settings/ocr",
        payload: {
          ocrSpaceApiKey: "abcdef1234",
          googleVisionApiKey: "AIzaWXYZ",
        },
      });
      assert.equal(stored.statusCode, 200);
      const storedView = stored.json() as OcrSettings;
      assert.equal(storedView.ocrSpace.configured, true);
      assert.equal(storedView.ocrSpace.hint, "1234");
      assert.equal(storedView.googleVision.configured, true);
      assert.equal(storedView.googleVision.hint, "WXYZ");
      // The raw secret must never be echoed back to the client.
      assert.ok(!JSON.stringify(storedView).includes("abcdef1234"));

      const view = await app.inject({
        method: "GET",
        url: "/api/settings/ocr",
      });
      assert.equal(view.statusCode, 200);
      assert.equal((view.json() as OcrSettings).ocrSpace.hint, "1234");

      // Empty string clears a key; omitting the other leaves it unchanged.
      const cleared = await app.inject({
        method: "PATCH",
        url: "/api/settings/ocr",
        payload: {
          ocrSpaceApiKey: "",
        },
      });
      assert.equal(cleared.statusCode, 200);
      const clearedView = cleared.json() as OcrSettings;
      assert.equal(clearedView.ocrSpace.configured, false);
      assert.equal(clearedView.ocrSpace.hint, null);
      assert.equal(clearedView.googleVision.configured, true);
    }
    finally {
      // Leave the settings table clean for re-runs.
      await app.inject({
        method: "PATCH",
        url: "/api/settings/ocr",
        payload: {
          ocrSpaceApiKey: "",
          googleVisionApiKey: "",
        },
      });
      await app.close();
    }
  },
);

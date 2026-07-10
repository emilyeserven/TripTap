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

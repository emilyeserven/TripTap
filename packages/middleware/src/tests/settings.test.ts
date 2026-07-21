import assert from "node:assert/strict";
import { test } from "node:test";
import type { OcrSettings } from "@sentence-bank/types";
import { buildApp } from "@/app";
import { parseDailyLineup, parseFavoriteResourceIds } from "@/services/settings";

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

test("PATCH /api/settings/start rejects a lineup without a date", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/settings/start",
    payload: {
      lineup: {
        items: [],
        exclusions: {
          mediaTypes: [],
          sessionTypes: [],
          learningAreas: [],
        },
      },
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("PATCH /api/settings/start rejects a malformed lineup date", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/settings/start",
    payload: {
      lineup: {
        date: "July 20th",
        items: [],
        exclusions: {
          mediaTypes: [],
          sessionTypes: [],
          learningAreas: [],
        },
      },
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("PATCH /api/settings/start rejects an unknown suggestion kind or session type", async () => {
  const app = await buildApp();
  const badKind = await app.inject({
    method: "PATCH",
    url: "/api/settings/start",
    payload: {
      lineup: {
        date: "2026-07-20",
        items: [
          {
            id: "i1",
            kind: "mystery",
            area: null,
            title: "??",
            description: null,
            to: "/start",
            done: false,
          },
        ],
        exclusions: {
          mediaTypes: [],
          sessionTypes: [],
          learningAreas: [],
        },
      },
    },
  });
  assert.equal(badKind.statusCode, 400);
  const badSessionType = await app.inject({
    method: "PATCH",
    url: "/api/settings/start",
    payload: {
      lineup: {
        date: "2026-07-20",
        items: [],
        exclusions: {
          mediaTypes: [],
          sessionTypes: ["juggling"],
          learningAreas: [],
        },
      },
    },
  });
  assert.equal(badSessionType.statusCode, 400);
  await app.close();
});

test("PATCH /api/settings/start accepts favorites and a full valid lineup", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/settings/start",
    payload: {
      favoriteResourceIds: ["bk-1", "bk-2"],
      lineup: {
        date: "2026-07-20",
        items: [
          {
            id: "i1",
            kind: "area",
            area: "Speaking",
            title: "Shadow section 3",
            description: "Speaking is your lowest area.",
            to: "/shadowing/new",
            search: {
              bookmarkId: "bk-1",
            },
            done: false,
          },
        ],
        exclusions: {
          mediaTypes: ["Book"],
          sessionTypes: ["drills"],
          learningAreas: ["Vocabulary"],
        },
      },
    },
  });
  // Without a live DB the handler fails downstream; schema validation must still pass.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("parseDailyLineup drops malformed items and unknown exclusion values", () => {
  const parsed = parseDailyLineup(JSON.stringify({
    date: "2026-07-20",
    items: [
      {
        id: "ok",
        kind: "area",
        area: "Nonsense",
        title: "Fine",
        to: "/practice",
        done: "yes",
      },
      {
        kind: "area",
        title: "No id",
        to: "/practice",
      },
    ],
    exclusions: {
      mediaTypes: ["Book", 3],
      sessionTypes: ["drills", "juggling"],
      learningAreas: ["Reading", "Cooking"],
      complexityMin: 1,
      complexityMax: "nope",
    },
  }));
  assert.equal(parsed?.items.length, 1);
  assert.equal(parsed?.items[0].id, "ok");
  // Unknown area coerces to null; a non-boolean done coerces to false.
  assert.equal(parsed?.items[0].area, null);
  assert.equal(parsed?.items[0].done, false);
  assert.deepEqual(parsed?.exclusions.mediaTypes, ["Book"]);
  assert.deepEqual(parsed?.exclusions.sessionTypes, ["drills"]);
  assert.deepEqual(parsed?.exclusions.learningAreas, ["Reading"]);
  // A numeric complexity bound is kept; a non-numeric one coerces to null.
  assert.equal(parsed?.exclusions.complexityMin, 1);
  assert.equal(parsed?.exclusions.complexityMax, null);
});

test("parseDailyLineup preserves the resource/section origin of a content item", () => {
  const parsed = parseDailyLineup(JSON.stringify({
    date: "2026-07-20",
    items: [
      {
        id: "section-a1",
        kind: "area",
        area: "Reading",
        title: "Read \"Ch. 1\" of Book A",
        to: "/reading-sessions/new",
        resourceId: "bookA",
        sectionId: "a1",
        done: false,
      },
    ],
  }));
  assert.equal(parsed?.items[0].resourceId, "bookA");
  assert.equal(parsed?.items[0].sectionId, "a1");
});

test("parseDailyLineup and parseFavoriteResourceIds tolerate corrupt values", () => {
  assert.equal(parseDailyLineup("not json"), null);
  assert.equal(parseDailyLineup(JSON.stringify({
    date: "yesterday",
    items: [],
  })), null);
  assert.deepEqual(parseFavoriteResourceIds("not json"), []);
  assert.deepEqual(parseFavoriteResourceIds(JSON.stringify(["a", 2, "b"])), ["a", "b"]);
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

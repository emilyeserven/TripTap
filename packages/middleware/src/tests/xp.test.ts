import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_XP_RATES } from "@sentence-bank/types";
import { buildApp } from "@/app";
import { parseXpRateOverrides } from "@/services/settings";
import {
  bookExercisesXp,
  countSentences,
  drillXp,
  isFilledWordNote,
  lessonXp,
  listeningXp,
  readingXp,
  shadowingXp,
  summarizeGrants,
  writingXp,
} from "@/services/xp";

const NOW = new Date("2026-07-20T12:00:00Z");
const RECENT = new Date("2026-07-19T12:00:00Z");
const OLD = new Date("2026-01-01T12:00:00Z");

test("countSentences splits on Japanese and latin terminators and newlines", () => {
  assert.equal(countSentences("今日は暑い。明日も暑い！本当？"), 3);
  assert.equal(countSentences("One sentence\nAnother line"), 2);
  assert.equal(countSentences("  終わり。  "), 1);
  // A block with no terminators still counts as one sentence.
  assert.equal(countSentences("句読点なし"), 1);
  assert.equal(countSentences(""), 0);
  assert.equal(countSentences(null), 0);
  assert.equal(countSentences("。。。"), 0);
});

test("readingXp counts translated lines at 2xp and word notes at 1xp", () => {
  const grants = readingXp([
    {
      mode: "line-by-line",
      freeformTranslation: null,
      lines: [
        {
          id: "l1",
          text: "a",
          translation: "A",
          summaryOnly: false,
          correction: null,
          needsCorrection: false,
        },
        {
          id: "l2",
          text: "b",
          translation: null,
          summaryOnly: false,
          correction: null,
          needsCorrection: true,
        },
        {
          id: "l3",
          text: "c",
          translation: "  ",
          summaryOnly: false,
          correction: null,
          needsCorrection: true,
        },
      ],
      wordNotes: [
        {
          id: "w1",
          word: "暑い",
          reading: "あつい",
          meaning: "hot",
          status: "shaky",
          flashcard: false,
        },
      ],
      createdAt: RECENT,
    },
  ]);
  assert.equal(grants.length, 1);
  assert.equal(grants[0].area, "Reading");
  // One translated line (2) + one word note (1); blank translation doesn't count.
  assert.equal(grants[0].xp, 3);
});

test("readingXp counts freeform translations by sentence", () => {
  const grants = readingXp([
    {
      mode: "freeform",
      freeformTranslation: "First. Second。",
      lines: null,
      wordNotes: null,
      createdAt: RECENT,
    },
  ]);
  assert.equal(grants[0].xp, 4);
});

test("writingXp counts sentences and corrections, skipping promoted my-sentences", () => {
  const grants = writingXp(
    [
      {
        text: "一文目。二文目。",
        corrections: [
          {
            id: "c1",
            original: "一文目。",
            corrected: "一文目です。",
            note: null,
            marks: null,
            mySentenceId: "ms1",
          },
        ],
        createdAt: RECENT,
      },
    ],
    [
      // Promoted from the writing above — must not double-count.
      {
        writingId: "w1",
        correction: "一文目です。",
        createdAt: RECENT,
      },
      // Standalone corrected sentence: 1 (sentence) + 1 (correction).
      {
        writingId: null,
        correction: "直した。",
        createdAt: RECENT,
      },
      // Standalone uncorrected sentence: 1.
      {
        writingId: null,
        correction: null,
        createdAt: RECENT,
      },
    ],
  );
  const total = grants.reduce((sum, g) => sum + g.xp, 0);
  // Writing: 2 sentences + 1 correction = 3; my-sentences: 2 + 1 = 3.
  assert.equal(total, 6);
  assert.ok(grants.every(g => g.area === "Writing"));
});

test("bookExercisesXp splits sheet XP across areas and rates grid entries at 0.25", () => {
  const sheets = [
    {
      id: "s1",
      layout: "list",
      learningAreas: ["Reading", "Grammar"] as ("Reading" | "Grammar")[],
      createdAt: RECENT,
    },
    {
      id: "s2",
      layout: "grid",
      learningAreas: null,
      createdAt: RECENT,
    },
  ];
  const answers = [
    {
      questionSheetId: "s1",
      entries: [
        {
          slotId: "q1",
          value: "a",
          correct: true,
          correction: null,
          reasoning: null,
          intendedMeaning: null,
          actualMeaning: null,
          marks: null,
        },
        {
          slotId: "q2",
          value: "b",
          correct: null,
          correction: null,
          reasoning: null,
          intendedMeaning: null,
          actualMeaning: null,
          marks: null,
        },
      ],
      createdAt: RECENT,
    },
    {
      questionSheetId: "s2",
      entries: [
        {
          slotId: "r1c1",
          value: "x",
          correct: null,
          correction: null,
          reasoning: null,
          intendedMeaning: null,
          actualMeaning: null,
          marks: null,
        },
      ],
      createdAt: RECENT,
    },
    // Orphaned answer sheet (its sheet was deleted) falls back to Grammar at the list rate.
    {
      questionSheetId: "gone",
      entries: [
        {
          slotId: "q1",
          value: "y",
          correct: null,
          correction: null,
          reasoning: null,
          intendedMeaning: null,
          actualMeaning: null,
          marks: null,
        },
      ],
      createdAt: RECENT,
    },
  ];
  const grants = bookExercisesXp(sheets, answers);
  const byArea = new Map<string, number>();
  for (const g of grants) byArea.set(g.area, (byArea.get(g.area) ?? 0) + g.xp);
  // s1 authored: 5 split → 2.5 each; s1 answers: 2 entries × 2 = 4 split → 2 each.
  assert.equal(byArea.get("Reading"), 4.5);
  // s2 authored (no areas → Grammar): 5; s2 answers: 1 × 0.25; orphan: 1 × 2.
  assert.equal(byArea.get("Grammar"), 2.5 + 2 + 5 + 0.25 + 2);
});

test("listening, shadowing, and drill XP use their per-unit rates", () => {
  const listening = listeningXp([
    {
      entries: [
        {
          id: "e1",
          text: "a",
          timestampMs: 0,
          mode: "submit",
          source: "video",
        },
        {
          id: "e2",
          text: "b",
          timestampMs: 5,
          mode: "submit",
          source: "video",
        },
      ],
      passive: false,
      durationMinutes: 0,
      createdAt: RECENT,
    },
  ]);
  assert.equal(listening[0].xp, 2);
  assert.equal(listening[0].area, "Listening");

  // A passive session scores by the minute (0.5 each), ignoring notes.
  const passive = listeningXp([
    {
      entries: null,
      passive: true,
      durationMinutes: 45,
      createdAt: RECENT,
    },
  ]);
  assert.equal(passive[0].xp, 22.5);
  assert.equal(passive[0].area, "Listening");
  assert.equal(passive[0].feature, "listening");

  const shadowing = shadowingXp([{
    completedLoops: 8,
    createdAt: RECENT,
  }]);
  assert.equal(shadowing[0].xp, 2);
  assert.equal(shadowing[0].area, "Speaking");

  const drills = drillXp([
    {
      date: "2026-07-19",
      questions: 4,
      learningArea: "Vocabulary",
    },
    {
      date: "2026-07-19",
      questions: 4,
      learningArea: null,
    },
  ]);
  assert.equal(drills[0].xp, 1);
  assert.equal(drills[0].area, "Vocabulary");
  // No area chosen falls back to Grammar.
  assert.equal(drills[1].area, "Grammar");
});

test("lessonXp splits lines to Listening and filled word notes to Vocabulary", () => {
  const grants = lessonXp([
    {
      date: "2026-07-19",
      listeningNotes: [
        {
          id: "n1",
          text: "line one",
        },
        {
          id: "n2",
          text: "line two",
        },
      ],
      wordNotes: [
        {
          id: "w1",
          word: "犬",
          reading: "いぬ",
          meaning: "dog",
          notes: null,
          status: "shaky",
          flashcard: false,
        },
        // Missing meaning → not fully filled out.
        {
          id: "w2",
          word: "猫",
          reading: "ねこ",
          meaning: null,
          notes: null,
          status: "unknown",
          flashcard: false,
        },
      ],
      createdAt: RECENT,
    } as never,
  ]);
  const listening = grants.find(g => g.area === "Listening");
  const vocab = grants.find(g => g.area === "Vocabulary");
  assert.equal(listening?.xp, 2);
  assert.equal(vocab?.xp, 0.5);
});

test("isFilledWordNote requires word, reading, and meaning", () => {
  const base = {
    id: "w",
    notes: null,
    status: "shaky" as const,
    flashcard: false,
  };
  assert.ok(isFilledWordNote({
    ...base,
    word: "犬",
    reading: "いぬ",
    meaning: "dog",
  }));
  assert.ok(!isFilledWordNote({
    ...base,
    word: "犬",
    reading: " ",
    meaning: "dog",
  }));
  assert.ok(!isFilledWordNote({
    ...base,
    word: null,
    reading: "いぬ",
    meaning: "dog",
  }));
});

test("summarizeGrants zero-fills all six areas and windows recent XP", () => {
  const summary = summarizeGrants(
    [
      {
        area: "Reading",
        feature: "reading",
        xp: 3,
        at: RECENT,
      },
      {
        area: "Reading",
        feature: "bookExercises",
        xp: 1,
        at: OLD,
      },
      {
        area: "Speaking",
        feature: "shadowing",
        xp: 0.25,
        at: OLD,
      },
    ],
    7,
    NOW,
  );
  assert.equal(summary.areas.length, 6);
  assert.equal(summary.totalXp, 4.25);
  const reading = summary.areas.find(a => a.area === "Reading");
  assert.equal(reading?.xp, 4);
  assert.equal(reading?.byFeature.reading, 3);
  assert.equal(reading?.byFeature.bookExercises, 1);
  const writing = summary.areas.find(a => a.area === "Writing");
  assert.equal(writing?.xp, 0);
  // Only the recent grant lands in the window, and empty areas are omitted there.
  assert.equal(summary.recent.totalXp, 3);
  assert.deepEqual(summary.recent.areas, [{
    area: "Reading",
    xp: 3,
  }]);
});

test("grant functions honor overridden rates", () => {
  const rates = {
    ...DEFAULT_XP_RATES,
    shadowingLoop: 1,
    readingWordNote: 3,
  };
  const shadowing = shadowingXp([{
    completedLoops: 4,
    createdAt: RECENT,
  }], rates);
  assert.equal(shadowing[0].xp, 4);
  const reading = readingXp([{
    mode: "line-by-line",
    freeformTranslation: null,
    lines: null,
    wordNotes: [{
      id: "w1",
      word: "暑い",
      reading: "あつい",
      meaning: "hot",
      status: "shaky",
      flashcard: false,
    }],
    createdAt: RECENT,
  }], rates);
  assert.equal(reading[0].xp, 3);
});

test("parseXpRateOverrides keeps only known keys with valid values", () => {
  const parsed = parseXpRateOverrides(JSON.stringify({
    shadowingLoop: 0.5,
    drillQuestion: -1,
    lessonLine: "2",
    nonsense: 9,
  }));
  assert.deepEqual(parsed, {
    shadowingLoop: 0.5,
  });
  assert.deepEqual(parseXpRateOverrides("not json"), {});
  assert.deepEqual(parseXpRateOverrides(null), {});
});

test("summarizeGrants counts today against the caller's local calendar day", () => {
  // Caller is UTC+2 (tzOffsetMinutes = −120), so their July 20 runs 22:00 Jul 19 → 22:00 Jul 20 UTC.
  const now = new Date("2026-07-20T12:00:00Z");
  const summary = summarizeGrants(
    [
      // 23:30 July 19 local (21:30 Jul 19 UTC) → yesterday for this caller.
      {
        area: "Reading",
        feature: "reading",
        xp: 2,
        at: new Date("2026-07-19T21:30:00Z"),
      },
      // 01:00 July 20 local (23:00 Jul 19 UTC) → today, even though it's UTC-yesterday.
      {
        area: "Reading",
        feature: "reading",
        xp: 4,
        at: new Date("2026-07-19T23:00:00Z"),
      },
      // A date-only drill grant dated today counts regardless of the UTC-midnight `at`.
      {
        area: "Grammar",
        feature: "drills",
        xp: 0.25,
        at: new Date("2026-07-20"),
        dateOnly: "2026-07-20",
      },
      // …and one dated yesterday doesn't.
      {
        area: "Grammar",
        feature: "drills",
        xp: 0.5,
        at: new Date("2026-07-19"),
        dateOnly: "2026-07-19",
      },
    ],
    7,
    now,
    -120,
  );
  assert.equal(summary.today.totalXp, 4.25);
  // Today is also broken out per area (only areas with XP today appear).
  assert.deepEqual(summary.today.areas, [
    {
      area: "Reading",
      xp: 4,
    },
    {
      area: "Grammar",
      xp: 0.25,
    },
  ]);
});

test("summarizeGrants treats today as the UTC day when no offset is given", () => {
  const now = new Date("2026-07-20T12:00:00Z");
  const summary = summarizeGrants(
    [{
      area: "Reading",
      feature: "reading",
      xp: 2,
      at: new Date("2026-07-20T01:30:00Z"),
    }],
    7,
    now,
  );
  assert.equal(summary.today.totalXp, 2);
});

test("GET /api/xp/summary rejects an out-of-range days value", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/xp/summary?days=0",
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("GET /api/xp/summary rejects a non-integer days value", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/xp/summary?days=abc",
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("GET /api/xp/summary rejects an out-of-range timezone offset", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/xp/summary?tzOffsetMinutes=900",
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

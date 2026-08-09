import assert from "node:assert/strict";
import { test } from "node:test";
import { computeStreak } from "@/services/streak";
import type { XpGrant } from "@/services/xp";
import { dayXpTotals } from "@/services/xp";

const totals = (entries: [string, number][]) => new Map(entries);

test("computeStreak returns zeros for an empty history", () => {
  const streak = computeStreak(totals([]), 10, "2026-08-09");
  assert.deepEqual(streak, {
    current: 0,
    best: 0,
    todayMet: false,
  });
});

test("an in-progress today never breaks the streak", () => {
  const streak = computeStreak(totals([
    ["2026-08-06", 10],
    ["2026-08-07", 12],
    ["2026-08-08", 10],
  ]), 10, "2026-08-09");
  assert.equal(streak.current, 3);
  assert.equal(streak.todayMet, false);
});

test("meeting today's goal extends the streak", () => {
  const streak = computeStreak(totals([
    ["2026-08-06", 10],
    ["2026-08-07", 12],
    ["2026-08-08", 10],
    ["2026-08-09", 11],
  ]), 10, "2026-08-09");
  assert.equal(streak.current, 4);
  assert.equal(streak.todayMet, true);
});

test("a gap resets current while best keeps the older run", () => {
  const streak = computeStreak(totals([
    ["2026-08-01", 10],
    ["2026-08-02", 10],
    ["2026-08-03", 10],
    ["2026-08-04", 10],
    // 08-05 missed.
    ["2026-08-06", 10],
    ["2026-08-07", 10],
  ]), 10, "2026-08-08");
  assert.equal(streak.current, 2);
  assert.equal(streak.best, 4);
});

test("exactly reaching the goal counts as met", () => {
  const streak = computeStreak(totals([["2026-08-08", 10]]), 10, "2026-08-09");
  assert.equal(streak.current, 1);
});

test("a partial day (some XP, under the goal) breaks the streak", () => {
  const streak = computeStreak(totals([
    ["2026-08-06", 10],
    ["2026-08-07", 4],
    ["2026-08-08", 10],
  ]), 10, "2026-08-09");
  assert.equal(streak.current, 1);
  assert.equal(streak.best, 1);
});

test("streak day arithmetic spans month boundaries", () => {
  const streak = computeStreak(totals([
    ["2026-07-30", 10],
    ["2026-07-31", 10],
    ["2026-08-01", 10],
  ]), 10, "2026-08-02");
  assert.equal(streak.current, 3);
  assert.equal(streak.best, 3);
});

test("dayXpTotals honors dateOnly and applies the day offset to timestamped grants", () => {
  const grants: XpGrant[] = [
    // Date-only source: the learner-entered date wins regardless of the offset.
    {
      area: "Grammar",
      feature: "drills",
      xp: 5,
      at: new Date("2026-08-05T00:00:00Z"),
      dateOnly: "2026-08-05",
    },
    // 01:00 UTC with a 180-minute day offset lands on the previous learning-day.
    {
      area: "Reading",
      feature: "reading",
      xp: 3,
      at: new Date("2026-08-05T01:00:00Z"),
    },
    {
      area: "Writing",
      feature: "writing",
      xp: 2,
      at: new Date("2026-08-05T12:00:00Z"),
    },
  ];
  const byDay = dayXpTotals(grants, 180);
  assert.equal(byDay.get("2026-08-05"), 5 + 2);
  assert.equal(byDay.get("2026-08-04"), 3);
});

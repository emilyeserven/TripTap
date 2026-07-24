import type { ActivityDay } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import { buildStrip } from "../lib/goal-achievement";

function day(date: string, totalXp: number): ActivityDay {
  return {
    date,
    totalXp,
    items: [],
  };
}

// Local noon on 2026-07-22 (month is 0-indexed) — todayDateString reads local date parts, so building
// `now` from local components keeps the generated day keys stable in any timezone.
const NOW = new Date(2026, 6, 22, 12, 0, 0);

describe("buildStrip", () => {
  it("marks a day met/partial/none against the daily goal", () => {
    const strip = buildStrip(
      [day("2026-07-22", 25), day("2026-07-21", 5), day("2026-07-20", 0)],
      20,
      0,
      3,
      NOW,
    );
    expect(strip.map(d => d.status)).toEqual(["none", "partial", "met"]);
    expect(strip.at(-1)?.isToday).toBe(true);
    expect(strip[0].isToday).toBe(false);
  });

  it("fills the full window even for days with no activity", () => {
    const strip = buildStrip([day("2026-07-22", 30)], 20, 0, 5, NOW);
    expect(strip).toHaveLength(5);
    expect(strip.filter(d => d.status === "none")).toHaveLength(4);
  });

  it("uses 'active' for any-XP days when no goal is set", () => {
    const strip = buildStrip([day("2026-07-22", 5), day("2026-07-21", 0)], null, 0, 2, NOW);
    expect(strip.map(d => d.status)).toEqual(["none", "active"]);
  });

  it("shifts the day window by dayStartHour so early-morning now still counts as the prior day", () => {
    // 01:00 local — before a 3am start, so the learning-"today" is the previous calendar date.
    const earlyNow = new Date(2026, 6, 22, 1, 0, 0);
    const strip = buildStrip([day("2026-07-21", 30)], 20, 3, 2, earlyNow);
    expect(strip.at(-1)?.dateKey).toBe("2026-07-21");
    expect(strip.at(-1)?.status).toBe("met");
  });
});

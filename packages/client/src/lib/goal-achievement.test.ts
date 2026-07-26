// @vitest-environment node
import type { ActivityDay } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import { todayDateString } from "./daily-lineup";
import { buildStrip, learningDayKey } from "./goal-achievement";

// A fixed mid-June noon: far from any DST transition, so subtracting whole days keeps the wall clock
// and the date keys derived below stay consistent with whatever calendar the test host runs in.
const NOW = new Date(2026, 5, 15, 12, 0, 0);
const DAY_MS = 86_400_000;

/** The local date key `buildStrip` will emit for `daysAgo` days before NOW at dayStartHour 0. */
function keyDaysAgo(daysAgo: number): string {
  return todayDateString(new Date(NOW.getTime() - daysAgo * DAY_MS));
}

function activity(entries: Record<string, number>): ActivityDay[] {
  return Object.entries(entries).map(([date, totalXp]) => ({
    date,
    totalXp,
  } as ActivityDay));
}

describe("learningDayKey", () => {
  it("returns the same day when the time is after the day-start hour", () => {
    const at = new Date(2026, 5, 15, 10, 0, 0); // 10:00, day starts at 04:00
    expect(learningDayKey(at, 4)).toBe(todayDateString(new Date(2026, 5, 15)));
  });

  it("rolls an early-morning time back into the previous learning day", () => {
    const at = new Date(2026, 5, 15, 2, 0, 0); // 02:00 is before a 04:00 day start
    expect(learningDayKey(at, 4)).toBe(todayDateString(new Date(2026, 5, 14)));
  });
});

describe("buildStrip", () => {
  it("returns `count` days oldest→newest with only the last flagged as today", () => {
    const strip = buildStrip([], 50, 0, 3, NOW);
    expect(strip.map(d => d.dateKey)).toEqual([keyDaysAgo(2), keyDaysAgo(1), keyDaysAgo(0)]);
    expect(strip.map(d => d.isToday)).toEqual([false, false, true]);
  });

  it("classifies met / partial / none against a positive daily goal", () => {
    const strip = buildStrip(
      activity({
        [keyDaysAgo(2)]: 100,
        [keyDaysAgo(1)]: 30,
        [keyDaysAgo(0)]: 0,
      }),
      50,
      0,
      3,
      NOW,
    );
    expect(strip.map(d => d.status)).toEqual(["met", "partial", "none"]);
    expect(strip.map(d => d.totalXp)).toEqual([100, 30, 0]);
  });

  it("counts a day that exactly meets the goal as met", () => {
    const strip = buildStrip(activity({
      [keyDaysAgo(0)]: 50,
    }), 50, 0, 1, NOW);
    expect(strip[0].status).toBe("met");
  });

  it("uses active/none when there is no goal set", () => {
    const withNull = buildStrip(activity({
      [keyDaysAgo(1)]: 5,
      [keyDaysAgo(0)]: 0,
    }), null, 0, 2, NOW);
    expect(withNull.map(d => d.status)).toEqual(["active", "none"]);
  });

  it("treats a zero goal the same as no goal", () => {
    const strip = buildStrip(activity({
      [keyDaysAgo(0)]: 5,
    }), 0, 0, 1, NOW);
    expect(strip[0].status).toBe("active");
  });
});

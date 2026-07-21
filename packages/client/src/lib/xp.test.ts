import { describe, expect, it } from "vitest";

import { dailyRadarMax } from "./xp";

describe("dailyRadarMax", () => {
  it("uses the daily goal when it covers the peak", () => {
    expect(dailyRadarMax(20, 12)).toBe(20);
    expect(dailyRadarMax(20, 20)).toBe(20);
  });

  it("grows in +5 steps from the goal until it covers the peak", () => {
    expect(dailyRadarMax(20, 22)).toBe(25);
    expect(dailyRadarMax(20, 31)).toBe(35);
  });

  it("falls back to a base of 5 (growing by 5) when no goal is set", () => {
    expect(dailyRadarMax(null, 0)).toBe(5);
    expect(dailyRadarMax(null, 7)).toBe(10);
    expect(dailyRadarMax(0, 3)).toBe(5);
  });

  it("never returns below 1", () => {
    expect(dailyRadarMax(null, 0)).toBeGreaterThanOrEqual(1);
  });
});

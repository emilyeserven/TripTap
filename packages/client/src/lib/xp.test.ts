import { describe, expect, it } from "vitest";

import { dailyRadarMax } from "./xp";

describe("dailyRadarMax", () => {
  it("starts at two-thirds of the daily goal (rounded)", () => {
    // 30 → 20; a peak within that base keeps the scale there.
    expect(dailyRadarMax(30, 15)).toBe(20);
    // 20 → round(13.33) = 13.
    expect(dailyRadarMax(20, 10)).toBe(13);
  });

  it("grows in +5 steps from the two-thirds base until it covers the peak", () => {
    // Base 20; 30 needs 20 → 25 → 30.
    expect(dailyRadarMax(30, 30)).toBe(30);
    // Base 13; 22 needs 13 → 18 → 23.
    expect(dailyRadarMax(20, 22)).toBe(23);
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

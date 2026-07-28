import type { XpDayAreas } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import { radarScaleMax } from "./xp";

const day = (date: string, areas: XpDayAreas["areas"]): XpDayAreas => ({
  date,
  areas,
});

describe("radarScaleMax", () => {
  it("is the highest single-area value across the days, rounded up to the nearest 10", () => {
    const days = [
      day("2026-07-28", [{
        area: "Reading",
        xp: 12,
      }, {
        area: "Grammar",
        xp: 3,
      }]),
      day("2026-07-27", [{
        area: "Writing",
        xp: 24,
      }]),
    ];
    // Peak is 24 → ceil to 30.
    expect(radarScaleMax(days)).toBe(30);
  });

  it("rounds an exact multiple of 10 to itself", () => {
    expect(radarScaleMax([day("2026-07-28", [{
      area: "Reading",
      xp: 20,
    }])])).toBe(20);
  });

  it("floors at 10 when there's little or no activity", () => {
    expect(radarScaleMax([])).toBe(10);
    expect(radarScaleMax([day("2026-07-28", [])])).toBe(10);
    expect(radarScaleMax([day("2026-07-28", [{
      area: "Reading",
      xp: 4,
    }])])).toBe(10);
  });
});

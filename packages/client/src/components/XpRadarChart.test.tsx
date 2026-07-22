import type { XpAreaSummary } from "@sentence-bank/types";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { XpRadarChart } from "./XpRadarChart";

import { formatXp } from "@/lib/xp";

const areas: XpAreaSummary[] = (
  ["Speaking", "Listening", "Reading", "Writing", "Grammar", "Vocabulary"] as const
).map((area, i) => ({
  area,
  xp: i * 2,
  byFeature: {},
}));

describe("XpRadarChart", () => {
  it("labels all six areas with their all-time XP", () => {
    render(<XpRadarChart areas={areas} />);
    for (const area of areas) {
      expect(screen.getByText(area.area)).toBeInTheDocument();
      expect(screen.getAllByText(`${formatXp(area.xp)} xp`).length).toBeGreaterThan(0);
    }
  });

  it("shows a legend with both series totals", () => {
    render(
      <XpRadarChart
        areas={areas}
        todayAreas={[{
          area: "Reading",
          xp: 3,
        }]}
      />,
    );
    // All-time total across the six areas is 0+2+4+6+8+10 = 30; today total is 3.
    expect(screen.getByText("All-time")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("describes both series for assistive tech", () => {
    render(
      <XpRadarChart
        areas={areas}
        todayAreas={[{
          area: "Reading",
          xp: 3,
        }]}
      />,
    );
    const svg = screen.getByRole("img");
    // Axes are reordered by RADAR_AREA_ORDER (Grammar first, Vocabulary last).
    expect(svg).toHaveAccessibleName(/All-time: Grammar 8.*Vocabulary 10/);
    expect(svg).toHaveAccessibleName(/Today: Reading 3/);
  });

  it("reports no today series when nothing was earned today", () => {
    render(<XpRadarChart areas={areas} />);
    expect(screen.getByRole("img")).toHaveAccessibleName(/Today: none/);
  });

  it("adds a yesterday series and reports the shared daily scale", () => {
    render(
      <XpRadarChart
        areas={areas}
        todayAreas={[{
          area: "Reading",
          xp: 3,
        }]}
        yesterdayAreas={[{
          area: "Grammar",
          xp: 4,
        }]}
        dailyXpGoal={30}
      />,
    );
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
    const svg = screen.getByRole("img");
    expect(svg).toHaveAccessibleName(/Yesterday: Grammar 4/);
    // The daily scale starts at two-thirds of the goal (30 → 20); the peak day-area (4) is under it.
    expect(svg).toHaveAccessibleName(/daily max of 20 xp/);
  });
});

describe("formatXp", () => {
  it("drops trailing zeros but keeps quarter points", () => {
    expect(formatXp(4)).toBe("4");
    expect(formatXp(0.25)).toBe("0.25");
    expect(formatXp(2.5)).toBe("2.5");
  });
});

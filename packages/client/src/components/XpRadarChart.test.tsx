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
    render(
      <XpRadarChart
        areas={areas}
        dayMax={20}
        dayLabel="Today"
      />,
    );
    for (const area of areas) {
      expect(screen.getByText(area.area)).toBeInTheDocument();
      expect(screen.getAllByText(`${formatXp(area.xp)} xp`).length).toBeGreaterThan(0);
    }
  });

  it("shows a legend with the all-time and selected-day totals", () => {
    render(
      <XpRadarChart
        areas={areas}
        dayAreas={[{
          area: "Reading",
          xp: 3,
        }]}
        dayMax={20}
        dayLabel="Today"
      />,
    );
    // All-time total across the six areas is 0+2+4+6+8+10 = 30; the day total is 3.
    expect(screen.getByText("All-time")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("uses the day label and reports the fixed scale for assistive tech", () => {
    render(
      <XpRadarChart
        areas={areas}
        dayAreas={[{
          area: "Reading",
          xp: 3,
        }]}
        dayMax={20}
        dayLabel="Jul 27"
      />,
    );
    const svg = screen.getByRole("img");
    // Axes are reordered by RADAR_AREA_ORDER (Grammar first, Vocabulary last).
    expect(svg).toHaveAccessibleName(/All-time: Grammar 8.*Vocabulary 10/);
    expect(svg).toHaveAccessibleName(/Jul 27: Reading 3/);
    expect(svg).toHaveAccessibleName(/scaled to a max of 20 xp/);
  });

  it("reports no day series when nothing was earned that day", () => {
    render(
      <XpRadarChart
        areas={areas}
        dayMax={10}
        dayLabel="Today"
      />,
    );
    expect(screen.getByRole("img")).toHaveAccessibleName(/Today: none/);
  });
});

describe("formatXp", () => {
  it("drops trailing zeros but keeps quarter points", () => {
    expect(formatXp(4)).toBe("4");
    expect(formatXp(0.25)).toBe("0.25");
    expect(formatXp(2.5)).toBe("2.5");
  });
});

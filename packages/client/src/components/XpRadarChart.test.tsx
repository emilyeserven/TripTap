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
  it("labels all six areas with their XP", () => {
    render(<XpRadarChart areas={areas} />);
    for (const area of areas) {
      expect(screen.getByText(area.area)).toBeInTheDocument();
      expect(screen.getAllByText(`${formatXp(area.xp)} xp`).length).toBeGreaterThan(0);
    }
  });

  it("describes the data for assistive tech", () => {
    render(<XpRadarChart areas={areas} />);
    const svg = screen.getByRole("img");
    expect(svg).toHaveAccessibleName(/Speaking 0.*Vocabulary 10/);
  });
});

describe("formatXp", () => {
  it("drops trailing zeros but keeps quarter points", () => {
    expect(formatXp(4)).toBe("4");
    expect(formatXp(0.25)).toBe("0.25");
    expect(formatXp(2.5)).toBe("2.5");
  });
});

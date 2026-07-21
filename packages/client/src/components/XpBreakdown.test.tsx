import type { XpSummary } from "@sentence-bank/types";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { XpBreakdown } from "./XpBreakdown";

const summary: XpSummary = {
  totalXp: 30,
  areas: [{
    area: "Reading",
    xp: 30,
    byFeature: {
      reading: 30,
    },
  }],
  recent: {
    days: 7,
    totalXp: 0,
    areas: [],
  },
  today: {
    totalXp: 3,
    areas: [{
      area: "Reading",
      xp: 3,
      byFeature: {
        reading: 3,
      },
    }],
  },
  yesterday: {
    totalXp: 5,
    areas: [{
      area: "Grammar",
      xp: 5,
      byFeature: {
        drills: 5,
      },
    }],
  },
};

describe("XpBreakdown", () => {
  it("offers a Yesterday tab alongside Today and All-time", () => {
    render(
      <XpBreakdown
        summary={summary}
        view="all-time"
        onViewChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("tab", {
      name: "Yesterday",
    })).toBeInTheDocument();
  });

  it("shows yesterday's areas and per-feature breakdown when viewing yesterday", () => {
    render(
      <XpBreakdown
        summary={summary}
        view="yesterday"
        onViewChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Grammar")).toBeInTheDocument();
    expect(screen.getByText("5 xp")).toBeInTheDocument();
    // The per-feature row uses the feature label.
    expect(screen.getByText("Drills")).toBeInTheDocument();
  });

  it("reports an empty yesterday cleanly", () => {
    render(
      <XpBreakdown
        summary={{
          ...summary,
          yesterday: {
            totalXp: 0,
            areas: [],
          },
        }}
        view="yesterday"
        onViewChange={vi.fn()}
      />,
    );
    expect(screen.getByText("No XP recorded yesterday.")).toBeInTheDocument();
  });
});

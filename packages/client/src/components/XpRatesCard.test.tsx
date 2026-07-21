import { DEFAULT_XP_RATES } from "@sentence-bank/types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { XpRatesCard } from "./XpRatesCard";

vi.mock("@/hooks/useSettings", () => ({
  useXpSettings: () => ({
    data: {
      rates: DEFAULT_XP_RATES,
    },
  }),
  useUpdateXpSettings: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

describe("XpRatesCard", () => {
  it("groups the rate inputs by learning area, with a Varies section", async () => {
    render(<XpRatesCard />);

    // Each learning area that owns a dedicated rate gets its own subsection heading.
    for (const area of ["Reading", "Writing", "Listening", "Speaking", "Vocabulary"]) {
      expect(await screen.findByRole("heading", {
        name: area,
      })).toBeInTheDocument();
    }

    // No rate feeds Grammar exclusively anymore (drills/theory choose their area), so it has no heading.
    expect(screen.queryByRole("heading", {
      name: "Grammar",
    })).not.toBeInTheDocument();

    // The book-exercise, drill, and theory rates count toward a per-record area, so they live under "Varies".
    expect(screen.getByRole("heading", {
      name: "Varies",
    })).toBeInTheDocument();
    expect(screen.getByText("Book exercises — question sheet created")).toBeInTheDocument();
    expect(screen.getByText("Drills — fill-in-the-blank question")).toBeInTheDocument();
    expect(screen.getByText("Drills — multiple-choice question")).toBeInTheDocument();
    expect(screen.getByText("Theory study — dense page")).toBeInTheDocument();
  });
});

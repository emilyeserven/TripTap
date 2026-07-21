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

    // Each learning area that owns a rate gets its own subsection heading.
    for (const area of ["Reading", "Writing", "Listening", "Speaking", "Grammar", "Vocabulary"]) {
      expect(await screen.findByRole("heading", {
        name: area,
      })).toBeInTheDocument();
    }

    // The book-exercise and drill rates split across a record's areas, so they live under "Varies".
    expect(screen.getByRole("heading", {
      name: "Varies",
    })).toBeInTheDocument();
    expect(screen.getByText("Book exercises — question sheet created")).toBeInTheDocument();
    expect(screen.getByText("Drills — question")).toBeInTheDocument();

    // A theory-study rate is grouped under Grammar (its label renders as an input field).
    expect(screen.getByText("Theory study — dense page")).toBeInTheDocument();
  });
});

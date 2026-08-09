import type { KanjiStatus, KanjiSummary } from "@sentence-bank/types";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { KanjiGrid } from "./KanjiGrid";

// The grid only needs Link as a styled anchor; a real router isn't under test here.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to: _to, params: _params, search: _search, children, ...rest
  }: Record<string, unknown> & { children?: React.ReactNode }) => (
    <a
      href="#"
      {...rest}
    >
      {children}
    </a>
  ),
}));

function kanji(char: string, overrides: Partial<KanjiSummary> = {}): KanjiSummary {
  return {
    char,
    occurrences: 3,
    itemCount: 2,
    kindCounts: {
      "sentence": 2,
      "my-sentence": 0,
      "practice": 0,
      "vocab": 0,
      "dialogue": 0,
      "writing": 0,
    },
    firstSeenAt: "2026-01-01T00:00:00.000Z",
    lastSeenAt: "2026-02-01T00:00:00.000Z",
    status: "new" as KanjiStatus,
    ...overrides,
  };
}

describe("KanjiGrid", () => {
  it("shows an empty state when nothing matches", () => {
    render(<KanjiGrid kanji={[]} />);
    expect(screen.getByText(/No kanji match these filters/i)).toBeInTheDocument();
  });

  it("renders one card per character, with its occurrence count", () => {
    render(
      <KanjiGrid
        kanji={[kanji("日"), kanji("本", {
          occurrences: 7,
        })]}
      />,
    );

    expect(screen.getByText("日")).toBeInTheDocument();
    expect(screen.getByText("本")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("announces the status in the link label, which the colour ring alone can't convey", () => {
    render(
      <KanjiGrid
        kanji={[kanji("学", {
          status: "known",
          occurrences: 4,
        })]}
      />,
    );

    expect(screen.getByLabelText("学 — 4 occurrences, known")).toBeInTheDocument();
  });

  it("says “occurrence” in the singular", () => {
    render(
      <KanjiGrid
        kanji={[kanji("聞", {
          occurrences: 1,
        })]}
      />,
    );

    expect(screen.getByLabelText("聞 — 1 occurrence, not started")).toBeInTheDocument();
  });
});

import type { DailyLineup } from "@sentence-bank/types";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DailyLineupCard } from "./DailyLineupCard";

// The card only needs Link as a styled anchor; a real router isn't under test here.
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

function lineup(): DailyLineup {
  return {
    date: "2026-07-20",
    items: [
      {
        id: "a",
        kind: "area",
        area: "Speaking",
        title: "Shadow something",
        description: null,
        to: "/shadowing/new",
        done: false,
      },
      {
        id: "b",
        kind: "goal",
        area: "Grammar",
        title: "Review は",
        description: null,
        to: "/grammar-notes/$id",
        params: {
          id: "n1",
        },
        done: true,
      },
    ],
    exclusions: {
      mediaTypes: [],
      sessionTypes: [],
      learningAreas: [],
    },
  };
}

describe("DailyLineupCard", () => {
  it("checks off an item and hands back the full lineup", () => {
    const onChange = vi.fn();
    render(
      <DailyLineupCard
        lineup={lineup()}
        mediaTypeOptions={[]}
        complexityScale={null}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", {
      name: "Mark \"Shadow something\" done",
    }));
    const next = onChange.mock.calls[0][0] as DailyLineup;
    expect(next.items[0].done).toBe(true);
    expect(next.items).toHaveLength(2);
  });

  it("strikes through completed items", () => {
    render(
      <DailyLineupCard
        lineup={lineup()}
        mediaTypeOptions={[]}
        complexityScale={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Review は").className).toContain("line-through");
    expect(screen.getByText("Shadow something").className).not.toContain("line-through");
  });

  it("reorders and removes items", () => {
    const onChange = vi.fn();
    render(
      <DailyLineupCard
        lineup={lineup()}
        mediaTypeOptions={[]}
        complexityScale={null}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", {
      name: "Move \"Review は\" up",
    }));
    expect((onChange.mock.calls[0][0] as DailyLineup).items.map(i => i.id)).toEqual(["b", "a"]);
    fireEvent.click(screen.getByRole("button", {
      name: "Remove \"Shadow something\" from the lineup",
    }));
    expect((onChange.mock.calls[1][0] as DailyLineup).items.map(i => i.id)).toEqual(["b"]);
  });

  it("shows the done tally", () => {
    render(
      <DailyLineupCard
        lineup={lineup()}
        mediaTypeOptions={[]}
        complexityScale={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("1/2 done")).toBeInTheDocument();
  });
});

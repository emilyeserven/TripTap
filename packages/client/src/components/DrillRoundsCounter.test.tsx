import type { DrillSession } from "@sentence-bank/types";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DrillRoundsCounter } from "./DrillRoundsCounter";

const mutate = vi.fn();

vi.mock("@/hooks/useDrillSessions", () => ({
  useUpdateDrillSession: () => ({
    mutate,
    isPending: false,
  }),
}));

function session(over: Partial<DrillSession>): DrillSession {
  return {
    id: "ds-1",
    date: "2026-07-20",
    title: null,
    notes: null,
    mistakes: null,
    rounds: 0,
    learningArea: null,
    createdAt: "2026-07-20T00:00:00Z",
    updatedAt: "2026-07-20T00:00:00Z",
    ...over,
  };
}

describe("DrillRoundsCounter", () => {
  beforeEach(() => {
    mutate.mockClear();
  });

  it("PATCHes the incremented count when adding a round", () => {
    render(
      <DrillRoundsCounter
        session={session({
          rounds: 3,
        })}
      />,
    );
    fireEvent.click(screen.getByRole("button", {
      name: "Add a round",
    }));
    expect(mutate).toHaveBeenCalledWith({
      id: "ds-1",
      input: {
        rounds: 4,
      },
    });
  });

  it("PATCHes the decremented count when removing a round", () => {
    render(
      <DrillRoundsCounter
        session={session({
          rounds: 3,
        })}
      />,
    );
    fireEvent.click(screen.getByRole("button", {
      name: "Remove a round",
    }));
    expect(mutate).toHaveBeenCalledWith({
      id: "ds-1",
      input: {
        rounds: 2,
      },
    });
  });

  it("disables removing below zero", () => {
    render(
      <DrillRoundsCounter
        session={session({
          rounds: 0,
        })}
      />,
    );
    expect(screen.getByRole("button", {
      name: "Remove a round",
    })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", {
      name: "Remove a round",
    }));
    expect(mutate).not.toHaveBeenCalled();
  });
});

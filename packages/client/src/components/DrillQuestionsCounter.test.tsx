import type { DrillSession } from "@sentence-bank/types";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DrillQuestionsCounter } from "./DrillQuestionsCounter";

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
    questions: 0,
    type: null,
    learningArea: null,
    bookmarkId: null,
    bookmarkTitle: null,
    bookmarkUrl: null,
    section: null,
    createdAt: "2026-07-20T00:00:00Z",
    updatedAt: "2026-07-20T00:00:00Z",
    ...over,
  };
}

describe("DrillQuestionsCounter", () => {
  beforeEach(() => {
    mutate.mockClear();
  });

  it("PATCHes the incremented count when adding a question", () => {
    render(
      <DrillQuestionsCounter
        session={session({
          questions: 3,
        })}
      />,
    );
    fireEvent.click(screen.getByRole("button", {
      name: "Add a question",
    }));
    expect(mutate).toHaveBeenCalledWith({
      id: "ds-1",
      input: {
        questions: 4,
      },
    });
  });

  it("PATCHes the decremented count when removing a question", () => {
    render(
      <DrillQuestionsCounter
        session={session({
          questions: 3,
        })}
      />,
    );
    fireEvent.click(screen.getByRole("button", {
      name: "Remove a question",
    }));
    expect(mutate).toHaveBeenCalledWith({
      id: "ds-1",
      input: {
        questions: 2,
      },
    });
  });

  it("disables removing below zero", () => {
    render(
      <DrillQuestionsCounter
        session={session({
          questions: 0,
        })}
      />,
    );
    expect(screen.getByRole("button", {
      name: "Remove a question",
    })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", {
      name: "Remove a question",
    }));
    expect(mutate).not.toHaveBeenCalled();
  });
});

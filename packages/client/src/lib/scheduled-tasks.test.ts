// @vitest-environment node
import type { ScheduledTask, ScheduledTaskTarget } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import { scheduledTaskOpen, scheduledTaskTitle } from "./scheduled-tasks";

function task(target: ScheduledTaskTarget, label: string | null = null): ScheduledTask {
  return {
    id: "sched-1",
    date: "2026-08-01",
    label,
    target,
    done: false,
  };
}

describe("scheduledTaskOpen", () => {
  it("opens a question sheet at its view", () => {
    const open = scheduledTaskOpen(
      {
        kind: "question-sheet",
        questionSheetId: "qs-1",
        title: "Exercise 3",
        partId: "q2",
      },
      null,
    );
    expect(open.internal).toEqual({
      to: "/question-sheets/$id",
      params: {
        id: "qs-1",
      },
    });
  });

  it("opens a legacy answer sheet at its edit form, focused on the part", () => {
    const open = scheduledTaskOpen(
      {
        kind: "answer-sheet",
        answerSheetId: "as-1",
        title: "Old exercise",
        partId: "q2",
      },
      null,
    );
    expect(open.internal?.to).toBe("/answer-sheets/$id/edit");
    expect(open.internal?.params).toEqual({
      id: "as-1",
    });
    expect(open.internal?.search).toEqual({
      part: "q2",
    });
  });

  it("routes a resource+section to a new reading session", () => {
    const open = scheduledTaskOpen(
      {
        kind: "resource",
        resourceId: "r-1",
        resourceTitle: "Genki",
        section: {
          id: "s1",
          label: "Ch. 3",
          type: "page",
          startValue: null,
          endValue: null,
        },
      },
      null,
    );
    expect(open.internal?.to).toBe("/reading-sessions/new");
  });
});

describe("scheduledTaskTitle", () => {
  it("prefers an explicit label", () => {
    expect(scheduledTaskTitle(task({
      kind: "question-sheet",
      questionSheetId: "qs-1",
      title: "Exercise 3",
      partId: null,
    }, "My label"))).toBe("My label");
  });

  it("falls back to the question-sheet snapshot title", () => {
    expect(scheduledTaskTitle(task({
      kind: "question-sheet",
      questionSheetId: "qs-1",
      title: "Exercise 3",
      partId: null,
    }))).toBe("Exercise 3");
  });

  it("uses a default when a question sheet has no snapshot title", () => {
    expect(scheduledTaskTitle(task({
      kind: "question-sheet",
      questionSheetId: "qs-1",
      title: null,
      partId: null,
    }))).toBe("Question sheet");
  });
});

import type { AnswerSheet, AnswerSheetEntry, QuestionSheet } from "@sentence-bank/types";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnswerSheetPartScores } from "./AnswerSheetPartScores";

function entry(slotId: string, value: string, correct: boolean | null = null): AnswerSheetEntry {
  return {
    slotId,
    value,
    correct,
    correction: null,
    reasoning: null,
    intendedMeaning: null,
    actualMeaning: null,
    marks: null,
  };
}

function sheet(overrides: Partial<QuestionSheet> = {}): QuestionSheet {
  return {
    id: "qs1",
    title: "Genki L3",
    notes: null,
    page: null,
    bookmarkId: null,
    bookmarkTitle: null,
    bookmarkUrl: null,
    sections: [],
    dueDate: null,
    firstQuestionNumber: 1,
    learningAreas: [],
    grammarTerms: [],
    layout: "list",
    questions: [
      {
        id: "q1",
        prompt: "One",
      },
      {
        id: "q2",
        prompt: "Two",
      },
    ],
    grid: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function answer(overrides: Partial<AnswerSheet> = {}): AnswerSheet {
  return {
    id: "as1",
    questionSheetId: "qs1",
    title: "Attempt",
    date: null,
    entries: [entry("q1", "答え1", true), entry("q2", "答え2", false)],
    hiddenPartIds: null,
    createdAt: "2026-07-15T00:00:00.000Z",
    updatedAt: "2026-07-15T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * A sheet whose questions each carry one sub-part, so it keeps a part per top-level question — the case
 * where a per-part breakdown is meaningful. A flat sheet (like {@link sheet}) collapses to one part.
 */
function partedSheet(overrides: Partial<QuestionSheet> = {}): QuestionSheet {
  return sheet({
    questions: [
      {
        id: "q1",
        prompt: "One",
        parts: [{
          id: "pa",
          label: "(a)",
        }],
      },
      {
        id: "q2",
        prompt: "Two",
        parts: [{
          id: "pb",
          label: "(b)",
        }],
      },
    ],
    ...overrides,
  });
}

describe("AnswerSheetPartScores", () => {
  it("shows a per-part breakdown and a total once graded", () => {
    render(
      <AnswerSheetPartScores
        questionSheet={partedSheet()}
        answerSheet={answer({
          entries: [entry("pa", "答えa", true), entry("pb", "答えb", false)],
        })}
      />,
    );
    expect(screen.getByText("Scores by part")).toBeInTheDocument();
    expect(screen.getByText("Part 1")).toBeInTheDocument();
    expect(screen.getByText("Part 2")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    // 1 of 2 correct across both parts.
    expect(screen.getByText("1/2 · 50%")).toBeInTheDocument();
  });

  it("renders nothing for a flat sheet with no sub-parts", () => {
    // A flat sheet collapses to a single part; its one score already sits in the header badge.
    const {
      container,
    } = render(
      <AnswerSheetPartScores
        questionSheet={sheet()}
        answerSheet={answer()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing before the sheet is complete", () => {
    const {
      container,
    } = render(
      <AnswerSheetPartScores
        questionSheet={partedSheet()}
        answerSheet={answer({
          entries: [entry("pa", "答えa", true)],
        })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when nothing has been graded", () => {
    const {
      container,
    } = render(
      <AnswerSheetPartScores
        questionSheet={partedSheet()}
        answerSheet={answer({
          entries: [entry("pa", "答えa"), entry("pb", "答えb")],
        })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("omits hidden parts and scores only the ones in play", () => {
    const three = sheet({
      questions: [
        {
          id: "q1",
          prompt: "One",
          parts: [{
            id: "pa",
            label: "(a)",
          }],
        },
        {
          id: "q2",
          prompt: "Two",
          parts: [{
            id: "pb",
            label: "(b)",
          }],
        },
        {
          id: "q3",
          prompt: "Three",
          parts: [{
            id: "pc",
            label: "(c)",
          }],
        },
      ],
    });
    render(
      <AnswerSheetPartScores
        questionSheet={three}
        answerSheet={answer({
          entries: [entry("pa", "答えa", true), entry("pc", "答えc", true)],
          hiddenPartIds: ["q2"],
        })}
      />,
    );
    // q2 hidden → Parts 1 and 3 shown, both correct → 2/2.
    expect(screen.getByText("Part 1")).toBeInTheDocument();
    expect(screen.getByText("Part 3")).toBeInTheDocument();
    expect(screen.queryByText("Part 2")).not.toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getAllByText("2/2 · 100%").length).toBeGreaterThan(0);
  });
});

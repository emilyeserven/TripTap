import type { AnswerSheetEntry, QuestionSheetQuestion } from "@sentence-bank/types";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnswerSheetListView } from "./AnswerSheetListView";

import { emptyAnswerEntry } from "@/lib/answer-sheets";

// Stub AnswerEntry to a marker exposing the slotId + label it was handed, so we can assert which
// slots the list actually renders (the real one pulls in TipTap via SentenceCorrector).
vi.mock("@/components/AnswerEntry", () => ({
  AnswerEntry: ({
    slotId, label,
  }: { slotId: string;
    label: string | null; }) => (
    <div
      data-testid="entry"
      data-slot={slotId}
    >{label}
    </div>
  ),
}));

// One question with sub-sub parts: (1)/(2) are headings, each with (i)/(ii) leaves.
const NESTED: QuestionSheetQuestion = {
  id: "q2",
  prompt: "II",
  parts: [
    {
      id: "h1",
      label: "(1)",
      parts: [{
        id: "l1i",
        label: "(i)",
      }, {
        id: "l1ii",
        label: "(ii)",
      }],
    },
    {
      id: "h2",
      label: "(2)",
      parts: [{
        id: "l2i",
        label: "(i)",
      }, {
        id: "l2ii",
        label: "(ii)",
      }],
    },
  ],
};

describe("AnswerSheetListView with nested parts", () => {
  it("renders an entry for every leaf slot, not the heading parts", () => {
    // Only leaves carry answers.
    const answers: Record<string, AnswerSheetEntry> = {
      l1i: {
        ...emptyAnswerEntry("l1i"),
        value: "a",
      },
      l1ii: {
        ...emptyAnswerEntry("l1ii"),
        value: "b",
      },
      l2i: {
        ...emptyAnswerEntry("l2i"),
        value: "c",
      },
      l2ii: {
        ...emptyAnswerEntry("l2ii"),
        value: "d",
      },
    };
    render(
      <AnswerSheetListView
        questions={[NESTED]}
        getEntry={id => answers[id] ?? emptyAnswerEntry(id)}
        markCorrect={vi.fn()}
        markIncorrect={vi.fn()}
        editCorrections={vi.fn()}
        saveCorrection={vi.fn()}
      />,
    );

    const slots = screen.getAllByTestId("entry").map(el => el.getAttribute("data-slot"));
    expect(slots).toEqual(["l1i", "l1ii", "l2i", "l2ii"]);
    // Heading parts are never answer slots.
    expect(slots).not.toContain("h1");
    expect(slots).not.toContain("h2");
    // Labels chain the part path (prompt shown separately on the card).
    expect(screen.getByText("(1) — (i)")).toBeTruthy();
    expect(screen.getByText("(2) — (ii)")).toBeTruthy();
  });

  it("shows the card once any nested leaf is answered", () => {
    const answers: Record<string, AnswerSheetEntry> = {
      l2ii: {
        ...emptyAnswerEntry("l2ii"),
        value: "only one",
      },
    };
    render(
      <AnswerSheetListView
        questions={[NESTED]}
        getEntry={id => answers[id] ?? emptyAnswerEntry(id)}
        markCorrect={vi.fn()}
        markIncorrect={vi.fn()}
        editCorrections={vi.fn()}
        saveCorrection={vi.fn()}
      />,
    );
    // The card renders (its prompt shows) and all four leaves are present.
    expect(screen.getByText("II")).toBeTruthy();
    expect(screen.getAllByTestId("entry")).toHaveLength(4);
  });
});

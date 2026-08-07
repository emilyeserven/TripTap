import type { AnswerSheetEntry } from "@sentence-bank/types";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnswerEntry } from "./AnswerEntry";

// SentenceCorrector pulls in TipTap; stub it and expose the props the entry passes in.
const correctorProps = vi.fn();
vi.mock("@/components/SentenceCorrector", () => ({
  SentenceCorrector: (props: { startWithNote?: boolean }) => {
    correctorProps(props);
    return <div data-testid="corrector">corrector</div>;
  },
}));
// ExplainedSentence renders markdown/ruby we don't need here.
vi.mock("@/components/ExplainedSentence", () => ({
  ExplainedSentence: ({
    text,
  }: { text: string }) => <p>{text}</p>,
}));

function entry(over: Partial<AnswerSheetEntry> = {}): AnswerSheetEntry {
  return {
    slotId: "s1",
    value: "食べます",
    correct: null,
    correction: null,
    reasoning: null,
    intendedMeaning: null,
    actualMeaning: null,
    marks: null,
    ...over,
  };
}

function renderEntry(over: Partial<AnswerSheetEntry> = {}) {
  const handlers = {
    markCorrect: vi.fn(),
    markIncorrect: vi.fn(),
    editCorrections: vi.fn(),
    saveCorrection: vi.fn(),
  };
  render(
    <AnswerEntry
      slotId="s1"
      label="(a)"
      entry={entry(over)}
      {...handlers}
    />,
  );
  return handlers;
}

describe("AnswerEntry", () => {
  beforeEach(() => correctorProps.mockClear());

  it("shows the correction controls in a row under the answer, corrector hidden", () => {
    renderEntry();
    expect(screen.getByRole("button", {
      name: /Correct/,
    })).toBeTruthy();
    expect(screen.getByRole("button", {
      name: /Wrong/,
    })).toBeTruthy();
    expect(screen.getByRole("button", {
      name: /Note/,
    })).toBeTruthy();
    // Not opened yet.
    expect(screen.queryByTestId("corrector")).toBeNull();
  });

  it("marks correct without revealing the corrector", () => {
    const h = renderEntry();
    fireEvent.click(screen.getByRole("button", {
      name: /Correct/,
    }));
    expect(h.markCorrect).toHaveBeenCalledWith("s1");
    expect(screen.queryByTestId("corrector")).toBeNull();
  });

  it("marks wrong and reveals the corrector (correction mode)", () => {
    const h = renderEntry();
    fireEvent.click(screen.getByRole("button", {
      name: /Wrong/,
    }));
    expect(h.markIncorrect).toHaveBeenCalledWith("s1");
    expect(screen.getByTestId("corrector")).toBeTruthy();
    expect(correctorProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startWithNote: false,
      }),
    );
  });

  it("opens the corrector straight into note mode from ＋ Note", () => {
    renderEntry();
    fireEvent.click(screen.getByRole("button", {
      name: /Note/,
    }));
    expect(screen.getByTestId("corrector")).toBeTruthy();
    expect(correctorProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startWithNote: true,
      }),
    );
  });

  it("offers Edit corrections once an entry has correction detail", () => {
    const h = renderEntry({
      correct: false,
      correction: "食べました",
    });
    const edit = screen.getByRole("button", {
      name: /Edit corrections/,
    });
    fireEvent.click(edit);
    expect(h.editCorrections).toHaveBeenCalledWith("s1");
  });
});

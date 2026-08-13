import type { Writing, WritingCorrection } from "@sentence-bank/types";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CorrectedVersionView } from "./CorrectedVersionView";

function correction(over: Partial<WritingCorrection> = {}): WritingCorrection {
  return {
    id: "c1",
    original: "猫がいる。",
    corrected: "猫がいます。",
    note: null,
    marks: null,
    mySentenceId: null,
    ...over,
  };
}

function writing(over: Partial<Writing> = {}): Writing {
  return {
    id: "w1",
    title: null,
    date: "2026-08-04",
    // Two lines: the first is corrected (with a note), the second was left untouched.
    text: "猫がいる。\n私は学生です。",
    meaning: null,
    comments: null,
    language: "Japanese",
    readyToReview: false,
    terms: null,
    corrections: [correction({
      note: "います: polite form",
    })],
    promptTitle: null,
    promptText: null,
    createdAt: "2026-08-04T00:00:00Z",
    updatedAt: "2026-08-04T00:00:00Z",
    ...over,
  };
}

describe("CorrectedVersionView", () => {
  it("shows clean corrected text with the diff hidden by default", () => {
    render(<CorrectedVersionView writing={writing()} />);
    expect(screen.getByText("猫がいます。")).toBeInTheDocument();
    expect(screen.getByText("私は学生です。")).toBeInTheDocument();
    expect(screen.queryByLabelText("Diff of your sentence against the correction")).toBeNull();
  });

  it("reveals the additions/removals diff when 'Show changes' is toggled", () => {
    render(<CorrectedVersionView writing={writing()} />);
    fireEvent.click(screen.getByRole("button", {
      name: /show changes/i,
    }));
    expect(screen.getByLabelText("Diff of your sentence against the correction")).toBeInTheDocument();
  });

  it("shows an explanation eye only for lines with a note, and toggles the note", () => {
    render(<CorrectedVersionView writing={writing()} />);
    // Only the corrected line carries a note, so there is exactly one eye toggle.
    const eyes = screen.getAllByRole("button", {
      name: /show explanation/i,
    });
    expect(eyes).toHaveLength(1);

    expect(screen.queryByText("polite form")).toBeNull();
    fireEvent.click(eyes[0]);
    expect(screen.getByText("polite form")).toBeInTheDocument();
  });

  it("offers no 'Show changes' toggle when nothing actually changed", () => {
    render(
      <CorrectedVersionView
        writing={writing({
          text: "猫がいる。",
          // "no change needed" entry — reviewed but unchanged.
          corrections: [correction({
            corrected: "",
            note: null,
          })],
        })}
      />,
    );
    expect(screen.queryByRole("button", {
      name: /show changes/i,
    })).toBeNull();
  });
});

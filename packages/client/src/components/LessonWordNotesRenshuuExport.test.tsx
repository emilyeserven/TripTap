import type { LessonWordNote } from "@sentence-bank/types";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LessonWordNotesRenshuuExport } from "./LessonWordNotesRenshuuExport";

function note(overrides: Partial<LessonWordNote>): LessonWordNote {
  return {
    id: "id",
    word: null,
    reading: null,
    meaning: null,
    notes: null,
    status: "shaky",
    flashcard: false,
    ...overrides,
  };
}

const TRIGGER = {
  name: "Copy for Renshuu",
};

describe("LessonWordNotesRenshuuExport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders nothing when no note is flashcard-marked", () => {
    render(
      <LessonWordNotesRenshuuExport
        wordNotes={[note({
          word: "行く",
          reading: "いく",
          flashcard: false,
        })]}
      />,
    );
    expect(screen.queryByRole("button", TRIGGER)).not.toBeInTheDocument();
  });

  it("renders nothing when the only flashcard note has no word", () => {
    render(
      <LessonWordNotesRenshuuExport
        wordNotes={[note({
          word: "  ",
          reading: "いく",
          flashcard: true,
        })]}
      />,
    );
    expect(screen.queryByRole("button", TRIGGER)).not.toBeInTheDocument();
  });

  it("shows the trigger when a flashcard note has a word", () => {
    render(
      <LessonWordNotesRenshuuExport
        wordNotes={[note({
          word: "行く",
          reading: "いく",
          flashcard: true,
        })]}
      />,
    );
    expect(screen.getByRole("button", TRIGGER)).toBeInTheDocument();
  });

  it("exports only flashcard-checked terms, as term/reading, excluding unchecked notes", () => {
    render(
      <LessonWordNotesRenshuuExport
        wordNotes={[
          note({
            word: "行く",
            reading: "いく",
            flashcard: true,
          }),
          note({
            word: "犬",
            reading: null,
            flashcard: true,
          }),
          note({
            word: "猫",
            reading: "ねこ",
            flashcard: false,
          }),
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", TRIGGER));
    const output = screen.getByRole("textbox", {
      name: "Renshuu vocab export text",
    });
    expect(output).toHaveValue("行く/いく\n犬");
  });

  it("copies the output and flips the label to Copied!", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText,
      },
    });
    render(
      <LessonWordNotesRenshuuExport
        wordNotes={[note({
          word: "行く",
          reading: "いく",
          flashcard: true,
        })]}
      />,
    );
    fireEvent.click(screen.getByRole("button", TRIGGER));
    fireEvent.click(screen.getByRole("button", {
      name: "Copy",
    }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("行く/いく"));
    expect(await screen.findByRole("button", {
      name: "Copied!",
    })).toBeInTheDocument();
  });
});

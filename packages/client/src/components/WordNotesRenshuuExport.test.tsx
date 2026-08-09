import type { LessonWordNote } from "@sentence-bank/types";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WordNotesRenshuuExport } from "./WordNotesRenshuuExport";

function note(overrides: Partial<LessonWordNote>): LessonWordNote {
  return {
    id: "id",
    word: null,
    reading: null,
    meaning: null,
    notes: null,
    status: "shaky",
    flashcard: false,
    flashcardMadeAt: null,
    ...overrides,
  };
}

const TRIGGER = {
  name: "Copy for Renshuu",
};

describe("WordNotesRenshuuExport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders nothing when no note is flashcard-marked", () => {
    render(
      <WordNotesRenshuuExport
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
      <WordNotesRenshuuExport
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
      <WordNotesRenshuuExport
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
      <WordNotesRenshuuExport
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
      <WordNotesRenshuuExport
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

  it("reports the exported note ids after a successful copy", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    const onExported = vi.fn();
    render(
      <WordNotesRenshuuExport
        wordNotes={[
          note({
            id: "a",
            word: "行く",
            reading: "いく",
            flashcard: true,
          }),
          note({
            id: "skipped",
            word: "猫",
            flashcard: false,
          }),
        ]}
        onExported={onExported}
      />,
    );
    fireEvent.click(screen.getByRole("button", TRIGGER));
    fireEvent.click(screen.getByRole("button", {
      name: "Copy",
    }));
    await waitFor(() => expect(onExported).toHaveBeenCalledWith(["a"]));
  });
});

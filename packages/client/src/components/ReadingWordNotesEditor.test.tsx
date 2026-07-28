import type { WordNote } from "@sentence-bank/types";
import type { ReactElement } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { ReadingWordNotesEditor } from "./ReadingWordNotesEditor";

// The row embeds Radix popovers (dictionary/example lookups) that observe size on mount.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  } as unknown as typeof globalThis.ResizeObserver;
});

/** The editor's rows embed the dictionary/example lookups, which use react-query. */
function renderInForm(ui: ReactElement) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <form>{ui}</form>
    </QueryClientProvider>,
  );
}

const note: WordNote = {
  id: "w-1",
  word: "難しい",
  reading: null,
  meaning: null,
  status: "shaky",
  flashcard: false,
  mySentenceId: null,
};

describe("ReadingWordNotesEditor", () => {
  it("swallows Enter in word-note fields so it can't submit the reading form", () => {
    renderInForm(
      <ReadingWordNotesEditor
        wordNotes={[note]}
        onChange={vi.fn()}
        language="Japanese"
      />,
    );

    // fireEvent returns false when the event's default action was prevented.
    for (const label of ["Word", "Reading", "Meaning"]) {
      const input = screen.getByLabelText(label);
      const notPrevented = fireEvent.keyDown(input, {
        key: "Enter",
      });
      expect(notPrevented).toBe(false);
    }
  });

  it("leaves Enter alone while an IME is composing (so kana/kanji candidates still confirm)", () => {
    renderInForm(
      <ReadingWordNotesEditor
        wordNotes={[note]}
        onChange={vi.fn()}
        language="Japanese"
      />,
    );

    const notPrevented = fireEvent.keyDown(screen.getByLabelText("Reading"), {
      key: "Enter",
      isComposing: true,
    });
    expect(notPrevented).toBe(true);
  });

  it("does not swallow other keys", () => {
    renderInForm(
      <ReadingWordNotesEditor
        wordNotes={[note]}
        onChange={vi.fn()}
        language="Japanese"
      />,
    );

    const notPrevented = fireEvent.keyDown(screen.getByLabelText("Word"), {
      key: "a",
    });
    expect(notPrevented).toBe(true);
  });
});

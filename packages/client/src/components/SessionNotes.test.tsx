import type { ListeningEntry } from "@sentence-bank/types";

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SessionNotes } from "./SessionNotes";

import { useUiStore } from "@/stores/uiStore";

const KANA_PLACEHOLDER = "Type romaji — converts to kana — and press Enter…";
const CONTEXT_PLACEHOLDER = "English context (optional, kept as-is)";
const PLAIN_PLACEHOLDER = "Type a note and press Enter…";

/** Reset the global UI store to its defaults between tests (it is a module-level singleton). */
afterEach(() => {
  useUiStore.setState({
    timestampMode: "submit",
    kanaEntry: false,
    kanaScript: "hiragana",
  });
});

function renderNotes(overrides?: {
  entries?: ListeningEntry[];
  getCurrentTimeMs?: () => number;
}) {
  const onChange = vi.fn();
  render(
    <SessionNotes
      entries={overrides?.entries ?? []}
      onChange={onChange}
      getCurrentTimeMs={overrides?.getCurrentTimeMs ?? (() => 0)}
      source="video"
    />,
  );
  return {
    onChange,
  };
}

describe("SessionNotes kana-only entry", () => {
  it("converts typed romaji to hiragana in the note field", () => {
    useUiStore.setState({
      kanaEntry: true,
      kanaScript: "hiragana",
    });
    renderNotes();
    const field = screen.getByPlaceholderText(KANA_PLACEHOLDER) as HTMLInputElement;
    fireEvent.change(field, {
      target: {
        value: "neko",
      },
    });
    expect(field.value).toBe("ねこ");
  });

  it("converts typed romaji to katakana when that script is selected", () => {
    useUiStore.setState({
      kanaEntry: true,
      kanaScript: "katakana",
    });
    renderNotes();
    const field = screen.getByPlaceholderText(KANA_PLACEHOLDER) as HTMLInputElement;
    fireEvent.change(field, {
      target: {
        value: "neko",
      },
    });
    expect(field.value).toBe("ネコ");
  });

  it("leaves the English-context field untranslated", () => {
    useUiStore.setState({
      kanaEntry: true,
    });
    renderNotes();
    const context = screen.getByPlaceholderText(CONTEXT_PLACEHOLDER) as HTMLInputElement;
    fireEvent.change(context, {
      target: {
        value: "the cat",
      },
    });
    expect(context.value).toBe("the cat");
  });

  it("submits kana + context on Enter in the context field and clears both", () => {
    useUiStore.setState({
      kanaEntry: true,
      kanaScript: "hiragana",
    });
    const {
      onChange,
    } = renderNotes();
    const kana = screen.getByPlaceholderText(KANA_PLACEHOLDER) as HTMLInputElement;
    const context = screen.getByPlaceholderText(CONTEXT_PLACEHOLDER) as HTMLInputElement;

    fireEvent.change(kana, {
      target: {
        value: "neko",
      },
    });
    fireEvent.change(context, {
      target: {
        value: "the cat",
      },
    });
    fireEvent.keyDown(context, {
      key: "Enter",
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const [appended] = onChange.mock.calls[0] as [ListeningEntry[]];
    expect(appended).toHaveLength(1);
    expect(appended[0]).toMatchObject({
      text: "ねこ",
      context: "the cat",
    });
    // Both fields cleared after submit.
    expect(kana.value).toBe("");
    expect(context.value).toBe("");
  });

  it("stamps typing-start from whichever field is typed first", () => {
    useUiStore.setState({
      kanaEntry: true,
      timestampMode: "typing-start",
    });
    let now = 1000;
    const {
      onChange,
    } = renderNotes({
      getCurrentTimeMs: () => now,
    });
    const kana = screen.getByPlaceholderText(KANA_PLACEHOLDER) as HTMLInputElement;
    const context = screen.getByPlaceholderText(CONTEXT_PLACEHOLDER) as HTMLInputElement;

    // Touch the context field first → stamp taken at t=1000.
    fireEvent.change(context, {
      target: {
        value: "the cat",
      },
    });
    now = 5000;
    fireEvent.change(kana, {
      target: {
        value: "neko",
      },
    });
    fireEvent.keyDown(kana, {
      key: "Enter",
    });

    const [appended] = onChange.mock.calls[0] as [ListeningEntry[]];
    expect(appended[0].timestampMs).toBe(1000);
    expect(appended[0].mode).toBe("typing-start");
  });

  it("shows a single plain field and no context field when kana mode is off", () => {
    renderNotes();
    expect(screen.getByPlaceholderText(PLAIN_PLACEHOLDER)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(CONTEXT_PLACEHOLDER)).not.toBeInTheDocument();
  });
});

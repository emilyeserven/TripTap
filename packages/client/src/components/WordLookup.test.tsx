import type { DictionaryEntry } from "@sentence-bank/types";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WordLookup } from "./WordLookup";

const entries: DictionaryEntry[] = [
  {
    word: "日曜日",
    reading: "にちようび",
    meanings: ["Sunday"],
    partsOfSpeech: ["Noun"],
    jlpt: "N5",
    common: true,
  },
];

const searchMutate = vi.fn();

vi.mock("@/hooks/useDictionary", () => ({
  useDictionarySearch: () => ({
    data: entries,
    mutate: searchMutate,
    isPending: false,
    isSuccess: true,
    isError: false,
    error: null,
  }),
}));

// Stand in for the draw pad so this test covers the wiring, not the canvas (which HandwritingPad
// tests own). The stub exposes one button that inserts a character, as picking a candidate would.
vi.mock("@/components/HandwritingPad", () => ({
  HandwritingPad: ({
    onPick,
  }: { onPick: (char: string) => void }) => (
    <button
      type="button"
      onClick={() => onPick("日")}
    >
      stub-insert
    </button>
  ),
}));

describe("WordLookup", () => {
  beforeEach(() => {
    searchMutate.mockReset();
  });

  const openPopover = () => {
    render(
      <WordLookup
        word=""
        onPick={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", {
      name: /Look up word/,
    }));
  };

  it("keeps the draw pad hidden until the pencil is toggled on", () => {
    openPopover();
    expect(screen.queryByText("stub-insert")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", {
      name: "Draw a character",
    }));
    expect(screen.getByText("stub-insert")).toBeInTheDocument();
  });

  it("appends a drawn character to the search box instead of searching for it directly", () => {
    openPopover();
    fireEvent.click(screen.getByRole("button", {
      name: "Draw a character",
    }));

    const input = screen.getByRole("textbox", {
      name: "Dictionary search",
    });
    fireEvent.click(screen.getByText("stub-insert"));
    expect(input).toHaveValue("日");

    // Drawing a character must not fire a lookup on its own — the learner may still be building a word.
    expect(searchMutate).not.toHaveBeenCalled();
  });

  it("builds a multi-character word up one drawn character at a time", () => {
    openPopover();
    fireEvent.click(screen.getByRole("button", {
      name: "Draw a character",
    }));

    fireEvent.click(screen.getByText("stub-insert"));
    fireEvent.click(screen.getByText("stub-insert"));
    expect(screen.getByRole("textbox", {
      name: "Dictionary search",
    })).toHaveValue("日日");
  });

  it("searches the assembled query through the normal path", () => {
    openPopover();
    fireEvent.click(screen.getByRole("button", {
      name: "Draw a character",
    }));
    fireEvent.click(screen.getByText("stub-insert"));

    fireEvent.submit(screen.getByRole("textbox", {
      name: "Dictionary search",
    }));
    expect(searchMutate).toHaveBeenCalledWith("日");
  });

  it("still hands a picked dictionary entry to the caller", () => {
    const onPick = vi.fn();
    render(
      <WordLookup
        word=""
        onPick={onPick}
      />,
    );
    fireEvent.click(screen.getByRole("button", {
      name: /Look up word/,
    }));
    fireEvent.click(screen.getByText("日曜日"));
    expect(onPick).toHaveBeenCalledWith(entries[0]);
  });
});

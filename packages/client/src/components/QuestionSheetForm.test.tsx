import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuestionSheetForm } from "./QuestionSheetForm";

import { partLabel, toLetters, toRoman } from "@/lib/question-sheet-parts";

vi.mock("@/hooks/useQuestionSheets", () => ({
  useCreateQuestionSheet: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateQuestionSheet: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));
// BookmarkPicker and TermPicker pull in bookmarks queries we don't care about here.
vi.mock("@/components/BookmarkPicker", () => ({
  BookmarkPicker: () => null,
}));
vi.mock("@/components/TermPicker", () => ({
  TermPicker: () => null,
}));
// The form reads the picked bookmark's section tree to resolve a section's page; not exercised here.
vi.mock("@/hooks/useBookmarks", () => ({
  useBookmarkRecord: () => ({
    data: undefined,
  }),
}));

/** Read the current labels of every rendered part input, in order. */
function partLabels(): string[] {
  return screen
    .getAllByLabelText("Part label")
    .map(el => (el as HTMLInputElement).value);
}

describe("part label helpers", () => {
  it("letters count from a, wrapping spreadsheet-style past z", () => {
    expect(toLetters(0)).toBe("a");
    expect(toLetters(25)).toBe("z");
    expect(toLetters(26)).toBe("aa");
    expect(toLetters(27)).toBe("ab");
  });

  it("roman numerals count from i", () => {
    expect(toRoman(1)).toBe("i");
    expect(toRoman(3)).toBe("iii");
    expect(toRoman(4)).toBe("iv");
    expect(toRoman(9)).toBe("ix");
  });

  it("partLabel wraps each style in parens by 0-based index", () => {
    expect([0, 1, 2].map(i => partLabel("letter", i))).toEqual(["(a)", "(b)", "(c)"]);
    expect([0, 1, 2].map(i => partLabel("number", i))).toEqual(["(1)", "(2)", "(3)"]);
    expect([0, 1, 2].map(i => partLabel("roman", i))).toEqual(["(i)", "(ii)", "(iii)"]);
  });
});

describe("QuestionSheetForm quick-add parts", () => {
  function addQuestion() {
    fireEvent.click(screen.getByRole("button", {
      name: /Add question/,
    }));
  }

  it("generates lettered parts by count (default style)", () => {
    render(<QuestionSheetForm />);
    addQuestion();

    fireEvent.change(screen.getByLabelText("Number of parts to add"), {
      target: {
        value: "3",
      },
    });
    fireEvent.click(screen.getByRole("button", {
      name: /^Add parts$/,
    }));

    expect(partLabels()).toEqual(["(a)", "(b)", "(c)"]);
  });

  it("appends and continues the letter sequence past existing parts", () => {
    render(<QuestionSheetForm />);
    addQuestion();

    // First batch via the inline adder shown on an empty question.
    fireEvent.change(screen.getByLabelText("Number of parts to add"), {
      target: {
        value: "2",
      },
    });
    fireEvent.click(screen.getByRole("button", {
      name: /^Add parts$/,
    }));

    // Adding collapsed the adder; re-open it (the only "Add parts" button now is the toggle).
    fireEvent.click(screen.getByRole("button", {
      name: /^Add parts$/,
    }));
    fireEvent.change(screen.getByLabelText("Number of parts to add"), {
      target: {
        value: "2",
      },
    });
    fireEvent.click(screen.getByRole("button", {
      name: /^Add parts$/,
    }));

    expect(partLabels()).toEqual(["(a)", "(b)", "(c)", "(d)"]);
  });

  it("collapses the parts adder once a part exists and offers a nested sub-part adder", () => {
    render(<QuestionSheetForm />);
    addQuestion();

    fireEvent.click(screen.getByRole("button", {
      name: /^Add part$/,
    }));

    // The inline count adder is gone (collapsed) and replaced by a compact toggle.
    expect(screen.queryByLabelText("Number of parts to add")).toBeNull();
    expect(screen.getByRole("button", {
      name: /^Add parts$/,
    })).toBeTruthy();
    // The new part exposes its own collapsed sub-part adder.
    expect(screen.getByRole("button", {
      name: /^Add sub-parts$/,
    })).toBeTruthy();
  });

  it("adds a sub-part under a part", () => {
    render(<QuestionSheetForm />);
    addQuestion();

    fireEvent.click(screen.getByRole("button", {
      name: /^Add part$/,
    }));
    // Expand the nested sub-part adder, then add one sub-part.
    fireEvent.click(screen.getByRole("button", {
      name: /^Add sub-parts$/,
    }));
    fireEvent.click(screen.getByRole("button", {
      name: /^Add sub-part$/,
    }));

    expect(screen.getByLabelText("Sub-part label")).toBeTruthy();
  });

  it("appends pasted labels verbatim, dropping blank lines", () => {
    render(<QuestionSheetForm />);
    addQuestion();

    fireEvent.change(screen.getByLabelText("Paste part labels"), {
      target: {
        value: "(x)\n\n  (y)  \n(z)\n",
      },
    });
    fireEvent.click(screen.getByRole("button", {
      name: /^Add$/,
    }));

    expect(partLabels()).toEqual(["(x)", "(y)", "(z)"]);
  });
});

import type { BookmarkSectionNode, QuestionSheet } from "@sentence-bank/types";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QuestionSheetForm } from "./QuestionSheetForm";

const {
  updateMutate, createMutate,
} = vi.hoisted(() => ({
  updateMutate: vi.fn(async (_arg: { id: string;
    input: { sections: { id: string;
      label: string; }[]; }; }) => ({
    id: "qs1",
  })),
  createMutate: vi.fn(async (_input: { sections: { id: string;
    label: string; }[]; }) => ({
    id: "qs1",
  })),
}));

vi.mock("@/hooks/useQuestionSheets", () => ({
  useCreateQuestionSheet: () => ({
    mutateAsync: createMutate,
    isPending: false,
  }),
  useUpdateQuestionSheet: () => ({
    mutateAsync: updateMutate,
    isPending: false,
  }),
  useQuestionSheets: () => ({
    data: [],
  }),
}));
vi.mock("@/components/BookmarkPicker", () => ({
  BookmarkPicker: () => null,
}));
vi.mock("@/components/TermPicker", () => ({
  TermPicker: () => null,
}));

// A small section tree so the Sections picker renders (gated on the tree being non-empty): one chapter
// with two sub-sections, to exercise breadcrumb labels and adding several at once.
const node = (over: Partial<BookmarkSectionNode> & Pick<BookmarkSectionNode, "id">): BookmarkSectionNode => ({
  name: "",
  parentId: null,
  type: "page",
  startValue: null,
  endValue: null,
  url: null,
  tagIds: [],
  completed: false,
  ...over,
});
const SECTION_TREE: BookmarkSectionNode[] = [
  node({
    id: "sec-1",
    name: "Chapter 1",
    startValue: "12",
  }),
  node({
    id: "sec-1a",
    name: "Vocabulary",
    parentId: "sec-1",
  }),
  node({
    id: "sec-1b",
    name: "Grammar",
    parentId: "sec-1",
  }),
];
vi.mock("@/hooks/useBookmarks", () => ({
  useBookmarkRecord: () => ({
    data: {
      sectionTree: SECTION_TREE,
    },
  }),
}));

const SHEET: QuestionSheet = {
  id: "qs1",
  title: "Genki I — Lesson 3",
  notes: null,
  page: null,
  bookmarkId: "bm-1",
  bookmarkTitle: "Genki I",
  bookmarkUrl: null,
  sections: [],
  dueDate: null,
  firstQuestionNumber: 1,
  learningAreas: [],
  grammarTerms: [],
  layout: "list",
  questions: [],
  grid: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("QuestionSheetForm — section committed on save", () => {
  beforeEach(() => {
    updateMutate.mockClear();
    createMutate.mockClear();
  });

  it("attaches a checked section immediately (no separate 'add' step) and saves it", async () => {
    render(<QuestionSheetForm questionSheet={SHEET} />);

    fireEvent.click(screen.getByRole("combobox", {
      name: "Sections",
    }));
    fireEvent.click(screen.getByText("Chapter 1"));
    // Checking attaches it right away — a removable chip appears.
    expect(screen.getByRole("button", {
      name: /^Remove /,
    })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", {
      name: /Save changes/,
    }));

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    const {
      input,
    } = updateMutate.mock.calls[0][0];
    expect(input.sections.map(s => s.id)).toEqual(["sec-1"]);
  });

  it("adds several sub-sections at once, with breadcrumb labels, and saves them together", async () => {
    render(<QuestionSheetForm questionSheet={SHEET} />);

    fireEvent.click(screen.getByRole("combobox", {
      name: "Sections",
    }));
    // The popover stays open on toggle, so both sub-sections can be checked in one pass. Sub-sections
    // carry a "Parent › Child" breadcrumb label.
    fireEvent.click(screen.getByText("Chapter 1 › Vocabulary"));
    fireEvent.click(screen.getByText("Chapter 1 › Grammar"));

    fireEvent.click(screen.getByRole("button", {
      name: /Save changes/,
    }));

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    const {
      input,
    } = updateMutate.mock.calls[0][0];
    expect(input.sections.map(s => s.id)).toEqual(["sec-1a", "sec-1b"]);
    expect(input.sections.map(s => s.label)).toEqual([
      "Chapter 1 › Vocabulary",
      "Chapter 1 › Grammar",
    ]);
  });

  it("removing a section's chip drops it before save", async () => {
    render(<QuestionSheetForm questionSheet={SHEET} />);

    fireEvent.click(screen.getByRole("combobox", {
      name: "Sections",
    }));
    fireEvent.click(screen.getByText("Chapter 1"));
    // Remove it again via its chip's remove button.
    fireEvent.click(screen.getByRole("button", {
      name: "Remove Chapter 1",
    }));
    expect(screen.queryByRole("button", {
      name: /^Remove /,
    })).toBeNull();

    fireEvent.click(screen.getByRole("button", {
      name: /Save changes/,
    }));

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    const {
      input,
    } = updateMutate.mock.calls[0][0];
    expect(input.sections).toEqual([]);
  });
});

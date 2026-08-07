import type { BookmarkSectionNode, QuestionSheet } from "@sentence-bank/types";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QuestionSheetForm } from "./QuestionSheetForm";

const {
  updateMutate, createMutate,
} = vi.hoisted(() => ({
  updateMutate: vi.fn(async (_arg: { id: string;
    input: { sections: { id: string }[] }; }) => ({
    id: "qs1",
  })),
  createMutate: vi.fn(async (_input: { sections: { id: string }[] }) => ({
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

// A one-node section tree so the Sections picker renders (gated on the tree being non-empty).
const SECTION_NODE: BookmarkSectionNode = {
  id: "sec-1",
  name: "Chapter 1",
  parentId: null,
  type: "page",
  startValue: "12",
  endValue: null,
  url: null,
  tagIds: [],
  completed: false,
};
vi.mock("@/hooks/useBookmarks", () => ({
  useBookmarkRecord: () => ({
    data: {
      sectionTree: [SECTION_NODE],
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

  it("saves a section picked but never added with 'Add section'", async () => {
    render(<QuestionSheetForm questionSheet={SHEET} />);

    // Pick a section in the cascading picker but deliberately skip the "Add section" button.
    fireEvent.click(screen.getByRole("combobox", {
      name: "Section",
    }));
    fireEvent.click(screen.getByText("Chapter 1"));
    // No chip yet — it is only a pending selection.
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
    expect(input.sections.map(s => s.id)).toEqual(["sec-1"]);
  });

  it("does not double-add a section already committed with 'Add section'", async () => {
    render(<QuestionSheetForm questionSheet={SHEET} />);

    fireEvent.click(screen.getByRole("combobox", {
      name: "Section",
    }));
    fireEvent.click(screen.getByText("Chapter 1"));
    fireEvent.click(screen.getByRole("button", {
      name: /Add section/,
    }));
    // Now committed as a chip.
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
});

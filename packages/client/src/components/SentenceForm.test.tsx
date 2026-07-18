import type { Sentence } from "@sentence-bank/types";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SentenceForm } from "./SentenceForm";

const updateMock = vi.fn();
const createMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("../hooks/useSentences", () => ({
  useCreateSentence: () => ({
    mutateAsync: createMock,
    isError: false,
    error: null,
  }),
  useUpdateSentence: () => ({
    mutateAsync: updateMock,
    isError: false,
    error: null,
  }),
  useDeleteSentence: () => ({
    mutate: deleteMock,
    isPending: false,
  }),
  useRegenerateFurigana: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  // Backs the tag-combobox options; empty list is fine (selected tags still show).
  useSentences: () => ({
    data: [],
  }),
}));

// The pickers fetch from the bookmarks host / sources and render router Links; stub them to no-ops.
// The seeded per-channel term state lives in SentenceForm itself, so it still submits.
vi.mock("./TermPicker", () => ({
  TermPicker: () => null,
}));
vi.mock("./SourcePicker", () => ({
  SourcePicker: () => null,
}));
vi.mock("./VocabLinkPicker", () => ({
  VocabLinkPicker: () => null,
}));

const sentence: Sentence = {
  id: "11111111-1111-1111-1111-111111111111",
  text: "毎朝コーヒーを飲みます。",
  translation: "I drink coffee every morning.",
  reading: null,
  readingError: null,
  language: "Japanese",
  source: null,
  sourceId: null,
  page: null,
  notes: null,
  tags: "verbs, routine",
  terms: [
    {
      id: "g1",
      name: "ます-form",
      kind: "taxonomy",
      sourceId: "s2",
      sourceLabel: "Grammar",
      category: "grammar",
    },
  ],
  captureId: null,
  hasAudio: false,
  hasImage: false,
  vocabCount: 0,
  createdAt: "2026-06-01T00:00:00.000Z",
};

describe("SentenceForm (edit mode)", () => {
  beforeEach(() => {
    updateMock.mockReset();
    createMock.mockReset();
    deleteMock.mockReset();
  });

  it("hydrates tags as combobox badges, exposes Delete, and saves via update preserving grammar terms", async () => {
    render(
      <SentenceForm sentence={sentence} />,
    );

    // The free-text tags are hydrated as selectable badges (a combobox, not a raw text field).
    expect(screen.getByText("verbs")).toBeInTheDocument();
    expect(screen.getByText("routine")).toBeInTheDocument();

    // Edit mode exposes Delete and uses a "Save changes" affordance.
    expect(screen.getByRole("button", {
      name: "Delete",
    })).toBeInTheDocument();
    const save = screen.getByRole("button", {
      name: "Save changes",
    });

    fireEvent.click(save);

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(createMock).not.toHaveBeenCalled();
    const [arg] = updateMock.mock.calls[0];
    expect(arg.id).toBe(sentence.id);
    expect(arg.input.tags).toBe("verbs, routine");
    expect(arg.input.terms).toEqual([
      expect.objectContaining({
        id: "g1",
        category: "grammar",
      }),
    ]);
  });

  it("deletes the sentence (after confirm) via the delete mutation", () => {
    const confirmSpy = vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    render(
      <SentenceForm sentence={sentence} />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: "Delete",
    }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock.mock.calls[0][0]).toBe(sentence.id);
    confirmSpy.mockRestore();
  });
});

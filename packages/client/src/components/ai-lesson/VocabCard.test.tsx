import type { VocabItem } from "@sentence-bank/types";

import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VocabCard } from "./VocabCard";

import { renderWithQuery } from "@/test-utils/renderWithQuery";

const updateVocab = vi.fn();
const updateLessonVocab = vi.fn();

// The basket toggle writes through to whichever table owns the row, so the card's `basketKind` decides
// which of these fires.
vi.mock("@/hooks/useVocab", () => ({
  useVocab: () => ({
    data: [],
  }),
  useUpdateVocab: () => ({
    mutate: updateVocab,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useAiLessons", () => ({
  useAiLessonContent: () => ({
    data: undefined,
  }),
  useUpdateVocabRenshuu: () => ({
    mutate: updateLessonVocab,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useGrammarNotes", () => ({
  useGrammarNotes: () => ({
    data: [],
  }),
  useUpdateGrammarNote: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useStartSettings: () => ({
    data: undefined,
  }),
  useUpdateStartSettings: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/hooks/useBookmarks", () => ({
  useBookmarkResources: () => ({
    data: undefined,
  }),
}));

const vocab: VocabItem = {
  id: "v1",
  sortOrder: 0,
  jp: "宿",
  yomi: "やど",
  en: "inn, lodging",
  lvl: "N5",
  cat: "lodging",
  renshuuAdded: false,
  renshuuList: null,
  starred: false,
};

describe("VocabCard renshuu annotation", () => {
  it("reports a checkbox toggle when editable", () => {
    const onRenshuuChange = vi.fn();
    renderWithQuery(
      <VocabCard
        vocab={vocab}
        onRenshuuChange={onRenshuuChange}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", {
      name: /In Renshuu/,
    }));
    expect(onRenshuuChange).toHaveBeenCalledWith({
      renshuuAdded: true,
    });
  });

  it("shows a read-only badge (no checkbox) when not editable and tracked", () => {
    renderWithQuery(
      <VocabCard
        vocab={{
          ...vocab,
          renshuuAdded: true,
          renshuuList: "Hagi trip",
        }}
      />,
    );
    expect(screen.getByText("Renshuu · Hagi trip")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shows nothing renshuu-related when not editable and untracked", () => {
    renderWithQuery(<VocabCard vocab={vocab} />);
    expect(screen.queryByText(/Renshuu/)).not.toBeInTheDocument();
  });
});

describe("VocabCard basket target", () => {
  beforeEach(() => {
    updateVocab.mockClear();
    updateLessonVocab.mockClear();
  });

  it("defaults to the AI-lesson vocab table", () => {
    renderWithQuery(<VocabCard vocab={vocab} />);
    fireEvent.click(screen.getByRole("button", {
      name: "Add to basket",
    }));
    expect(updateLessonVocab).toHaveBeenCalledWith({
      id: "v1",
      patch: {
        starred: true,
      },
    });
    expect(updateVocab).not.toHaveBeenCalled();
  });

  it("targets the bank vocab table when told the row is a bank row", () => {
    renderWithQuery(
      <VocabCard
        vocab={vocab}
        basketKind="vocab"
      />,
    );
    fireEvent.click(screen.getByRole("button", {
      name: "Add to basket",
    }));
    expect(updateVocab).toHaveBeenCalledWith({
      id: "v1",
      input: {
        starred: true,
      },
    });
    expect(updateLessonVocab).not.toHaveBeenCalled();
  });
});

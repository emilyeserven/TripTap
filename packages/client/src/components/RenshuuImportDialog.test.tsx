import type { RenshuuExampleSentence } from "@sentence-bank/types";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RenshuuImportDialog } from "./RenshuuImportDialog";

const mutateAsync = vi.fn();
const mineMutateAsync = vi.fn();
const practiceMutateAsync = vi.fn();

const examples: RenshuuExampleSentence[] = [
  {
    id: 7,
    text: "犬が好きです。",
    reading: [
      {
        t: "犬",
        r: "いぬ",
      },
      {
        t: "が好きです。",
        r: null,
      },
    ],
    translation: "I like dogs.",
  },
  {
    id: 8,
    text: "猫も好きです。",
    reading: null,
    translation: null,
  },
];

// The search hook is a react-query mutation; expose a fixed result set as if a search already ran.
vi.mock("@/hooks/useRenshuu", () => ({
  useRenshuuExamples: () => ({
    data: examples,
    mutate: vi.fn(),
    isPending: false,
    isSuccess: true,
  }),
}));

// The dialog resolves its destination through all three create-many hooks; stub each one.
vi.mock("@/hooks/useSentences", () => ({
  useCreateSentencesMany: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useMySentences", () => ({
  useCreateMySentencesMany: () => ({
    mutateAsync: mineMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/hooks/usePracticeSentences", () => ({
  useCreatePracticeSentencesMany: () => ({
    mutateAsync: practiceMutateAsync,
    isPending: false,
  }),
}));

/** Open the dialog and tick the first result. */
function openAndSelectFirst() {
  render(<RenshuuImportDialog />);
  fireEvent.click(screen.getByRole("button", {
    name: /Import from Renshuu/,
  }));
  fireEvent.click(screen.getAllByRole("checkbox")[0]);
}

describe("RenshuuImportDialog", () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mineMutateAsync.mockReset();
    practiceMutateAsync.mockReset();
  });

  it("imports the selected sentence into the bank with a Renshuu source note", async () => {
    openAndSelectFirst();

    fireEvent.click(screen.getByRole("button", {
      name: /^Import 1$/,
    }));

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith([
      {
        text: "犬が好きです。",
        translation: "I like dogs.",
        language: "Japanese",
        terms: null,
        tags: "renshuu",
        notes: "From Renshuu #7",
        sourceId: null,
        page: null,
        captureId: null,
      },
    ]);
    expect(mineMutateAsync).not.toHaveBeenCalled();
  });

  it("routes the import to My Sentences when that destination is picked", async () => {
    openAndSelectFirst();

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("My Sentences"));

    fireEvent.click(screen.getByRole("button", {
      name: /^Import 1$/,
    }));

    expect(mineMutateAsync).toHaveBeenCalledTimes(1);
    expect(mineMutateAsync).toHaveBeenCalledWith([
      {
        text: "犬が好きです。",
        translation: "I like dogs.",
        language: "Japanese",
        terms: null,
      },
    ]);
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("renders furigana and keeps the English behind a reveal control", () => {
    render(<RenshuuImportDialog />);

    fireEvent.click(screen.getByRole("button", {
      name: /Import from Renshuu/,
    }));

    expect(screen.getByText("いぬ")).toBeInTheDocument();

    const reveal = screen.getByRole("button", {
      name: "Reveal translation",
    });
    expect(reveal).toHaveTextContent("I like dogs.");
  });
});

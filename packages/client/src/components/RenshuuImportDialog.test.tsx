import type { RenshuuExampleSentence } from "@sentence-bank/types";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RenshuuImportDialog } from "./RenshuuImportDialog";

const mutateAsync = vi.fn();

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

vi.mock("@/hooks/useSentences", () => ({
  useCreateSentencesMany: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

describe("RenshuuImportDialog", () => {
  beforeEach(() => {
    mutateAsync.mockReset();
  });

  it("imports the selected sentence into the bank with a Renshuu source note", async () => {
    render(<RenshuuImportDialog />);

    fireEvent.click(screen.getByRole("button", {
      name: /Import from Renshuu/,
    }));

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    fireEvent.click(screen.getByRole("button", {
      name: /^Import 1$/,
    }));

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith([
      {
        text: "犬が好きです。",
        translation: "I like dogs.",
        language: "Japanese",
        tags: "renshuu",
        notes: "From Renshuu #7",
      },
    ]);
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

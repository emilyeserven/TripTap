import type { ExampleSentence } from "@sentence-bank/types";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TatoebaImportDialog } from "./TatoebaImportDialog";

const mutateAsync = vi.fn();

const examples: ExampleSentence[] = [
  {
    id: 42,
    text: "犬が好きです。",
    translation: "I like dogs.",
    license: "CC BY 2.0 FR",
    owner: "hanako",
  },
  {
    id: 43,
    text: "猫も好きです。",
    translation: null,
    license: "CC BY 2.0 FR",
    owner: null,
  },
];

// The search hook is a react-query mutation; expose a fixed result set as if a search already ran.
vi.mock("@/hooks/useTatoeba", () => ({
  useExampleSentences: () => ({
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

describe("TatoebaImportDialog", () => {
  beforeEach(() => {
    mutateAsync.mockReset();
  });

  it("imports the selected sentences into the bank with Tatoeba attribution", async () => {
    render(<TatoebaImportDialog />);

    fireEvent.click(screen.getByRole("button", {
      name: /Import from Tatoeba/,
    }));

    // Pick the first result only.
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
        tags: "tatoeba",
        notes: "From Tatoeba #42 (by hanako) · CC BY 2.0 FR",
      },
    ]);
  });

  it("credits an unknown author when the owner is missing", async () => {
    render(<TatoebaImportDialog />);

    fireEvent.click(screen.getByRole("button", {
      name: /Import from Tatoeba/,
    }));

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);

    fireEvent.click(screen.getByRole("button", {
      name: /^Import 1$/,
    }));

    expect(mutateAsync).toHaveBeenCalledWith([
      {
        text: "猫も好きです。",
        translation: null,
        language: "Japanese",
        tags: "tatoeba",
        notes: "From Tatoeba #43 (unknown author) · CC BY 2.0 FR",
      },
    ]);
  });
});

import type { PracticeSentence } from "@sentence-bank/types";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PracticeSentenceView } from "./PracticeSentenceView";

// The view only needs Link as a styled anchor; a real router isn't under test here.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to: _to, params: _params, search: _search, children, ...rest
  }: Record<string, unknown> & { children?: React.ReactNode }) => (
    <a
      href="#"
      {...rest}
    >
      {children}
    </a>
  ),
}));

const mutate = vi.fn();

vi.mock("@/hooks/usePracticeSentences", () => ({
  usePracticeSentenceVocab: () => ({
    data: [],
  }),
  useUpdatePracticeSentence: () => ({
    mutate,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useMySentences", () => ({
  useMySentencesForPractice: () => ({
    data: [],
  }),
}));

function sentence(passes: PracticeSentence["passes"]): PracticeSentence {
  return {
    id: "ps-1",
    text: "猫が寝ている。",
    readingNote: null,
    reading: null,
    readingError: null,
    language: "Japanese",
    translation: "The cat is sleeping.",
    guess: null,
    literal: null,
    register: null,
    nuance: null,
    target: null,
    targetKind: null,
    comprehension: null,
    needsCorrection: false,
    correction: null,
    words: null,
    grammar: null,
    passes,
    terms: null,
    sourceId: null,
    page: null,
    captureId: null,
    sentenceId: null,
    hasImage: false,
    createdAt: "2026-07-20T00:00:00.000Z",
  };
}

describe("PracticeSentenceView study passes", () => {
  it("stamps an ISO timestamp when a pass is toggled on", () => {
    mutate.mockClear();
    render(<PracticeSentenceView practiceSentence={sentence(null)} />);

    fireEvent.click(screen.getByRole("button", {
      name: "Read aloud",
    }));

    expect(mutate).toHaveBeenCalledTimes(1);
    const call = mutate.mock.calls[0]?.[0] as { id: string;
      input: { passes: Record<string, unknown> }; };
    expect(call.id).toBe("ps-1");
    const value = call.input.passes.read;
    expect(typeof value).toBe("string");
    expect(Number.isNaN(new Date(value as string).getTime())).toBe(false);
  });

  it("removes the key when a completed pass is toggled off, keeping the others", () => {
    mutate.mockClear();
    render(
      <PracticeSentenceView
        practiceSentence={sentence({
          read: "2026-07-19T09:00:00.000Z",
          card: true,
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: "Read aloud",
    }));

    const call = mutate.mock.calls[0]?.[0] as { input: { passes: Record<string, unknown> } };
    expect(call.input.passes).toEqual({
      card: true,
    });
  });
});

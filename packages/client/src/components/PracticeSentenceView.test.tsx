import type { Sentence } from "@sentence-bank/types";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PracticeSentenceView } from "./PracticeSentenceView";

import { makeSentence } from "@/test-utils/sentence";

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

vi.mock("@/hooks/useSentences", () => ({
  useSentenceVocab: () => ({
    data: [],
  }),
  useUpdateSentence: () => ({
    mutate,
    isPending: false,
  }),
  useSentencesForPractice: () => ({
    data: [],
  }),
}));

function sentence(passes: Sentence["passes"]): Sentence {
  return makeSentence({
    id: "ps-1",
    kind: "practice",
    text: "猫が寝ている。",
    translation: "The cat is sleeping.",
    passes,
    createdAt: "2026-07-20T00:00:00.000Z",
  });
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

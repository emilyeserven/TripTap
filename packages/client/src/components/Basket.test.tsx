import type { BasketGrammar, BasketSentence } from "@/stores/basketStore";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Basket } from "./Basket";

import { useBasketStore } from "@/stores/basketStore";
import { useDisplayStore } from "@/stores/displayStore";

// The send-to actions reach the API through these hooks; the basket behavior under test is store-local.
const createPracticeMutate = vi.fn(
  (_inputs: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.(),
);

vi.mock("@/hooks/useSentences", () => ({
  useCreateSentencesMany: () => ({
    mutate: createPracticeMutate,
    isPending: false,
  }),
  useSentences: () => ({
    data: [],
  }),
}));

vi.mock("@/hooks/useShadowingLists", () => ({
  useShadowingLists: () => ({
    data: [],
  }),
  useUpdateShadowingList: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

const sentence: BasketSentence = {
  kind: "sentence",
  id: "s1",
  text: "毎朝コーヒーを飲みます。",
  translation: "I drink coffee every morning.",
  reading: null,
};

const grammar: BasketGrammar = {
  kind: "grammar",
  id: "g1",
  pattern: "〜たいんですが",
  gloss: "softened request",
  note: "explanation",
  examples: [{
    jp: "行きたいんですが",
    en: "I'd like to go, but…",
  }],
};

describe("Basket", () => {
  beforeEach(() => {
    useBasketStore.setState({
      items: [],
      expanded: false,
    });
    useDisplayStore.setState({
      slideMode: false,
      superFocus: false,
    });
  });

  it("renders nothing when empty", () => {
    const {
      container,
    } = render(<Basket />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the collapsed pill with a count", () => {
    useBasketStore.setState({
      items: [sentence],
      expanded: false,
    });
    render(<Basket />);
    expect(screen.getByRole("button", {
      name: "Open basket (1)",
    })).toBeInTheDocument();
  });

  it("shows grouped sections and the grammar construction cue when expanded", () => {
    useBasketStore.setState({
      items: [sentence, grammar],
      expanded: true,
    });
    render(<Basket />);
    expect(screen.getByText("Sentences (1)")).toBeInTheDocument();
    expect(screen.getByText("Grammar (1)")).toBeInTheDocument();
    // The construction pattern is surfaced as the cue.
    expect(screen.getByText("〜たいんですが")).toBeInTheDocument();
  });

  it("stays hidden in slide mode", () => {
    useBasketStore.setState({
      items: [sentence],
      expanded: true,
    });
    useDisplayStore.setState({
      slideMode: true,
    });
    const {
      container,
    } = render(<Basket />);
    expect(container).toBeEmptyDOMElement();
  });

  it("clears the basket from the header", () => {
    useBasketStore.setState({
      items: [sentence],
      expanded: true,
    });
    render(<Basket />);
    fireEvent.click(screen.getByRole("button", {
      name: "Clear",
    }));
    expect(useBasketStore.getState().items).toHaveLength(0);
  });

  it("sends sentences to practice and removes them from the basket", () => {
    createPracticeMutate.mockClear();
    useBasketStore.setState({
      items: [sentence, grammar],
      expanded: true,
    });
    render(<Basket />);
    fireEvent.click(screen.getByRole("button", {
      name: "To practice",
    }));
    expect(createPracticeMutate).toHaveBeenCalledTimes(1);
    expect(createPracticeMutate.mock.calls[0]?.[0]).toEqual([{
      kind: "practice",
      text: sentence.text,
      translation: sentence.translation,
      language: "Japanese",
    }]);
    // Sent sentences leave the basket; unrelated kinds stay.
    expect(useBasketStore.getState().items).toEqual([grammar]);
  });
});

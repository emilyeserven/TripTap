import type { BasketGrammar, BasketSentence } from "@/stores/basketStore";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Basket } from "./Basket";

import { useBasketStore } from "@/stores/basketStore";
import { useDisplayStore } from "@/stores/displayStore";
import { renderWithQuery } from "@/test-utils/renderWithQuery";

// The send-to actions reach the API through these hooks; the basket behavior under test is store-local.
const createPracticeMutate = vi.fn(
  (_inputs: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.(),
);

vi.mock("@/hooks/useSentences", () => ({
  useCreateSentencesMany: () => ({
    mutate: createPracticeMutate,
    isPending: false,
  }),
}));

const updateListMutate = vi.fn(
  (_input: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.(),
);

vi.mock("@/hooks/useShadowingLists", () => ({
  useShadowingLists: () => ({
    data: [{
      id: "l1",
      name: "Morning drill",
      sentenceIds: [],
    }],
  }),
  useUpdateShadowingList: () => ({
    mutate: updateListMutate,
    isPending: false,
  }),
}));

// The server-backed half of the basket. Each case sets what these return; by default nothing is stored,
// so only the local items show and the basket behaves exactly as it did before write-through.
const starredVocab = vi.fn<() => { id: string;
  term: string;
  reading: string | null;
  meaning: string | null;
  starred: boolean; }[]>(() => []);
const updateVocabMutate = vi.fn();
const updateStartMutate = vi.fn();

vi.mock("@/hooks/useVocab", () => ({
  useVocab: () => ({
    data: starredVocab(),
  }),
  useUpdateVocab: () => ({
    mutate: updateVocabMutate,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useAiLessons", () => ({
  useAiLessonContent: () => ({
    data: undefined,
  }),
  useUpdateVocabRenshuu: () => ({
    mutate: vi.fn(),
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
    mutate: updateStartMutate,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useBookmarks", () => ({
  useBookmarkResources: () => ({
    data: undefined,
  }),
}));

const sentence: BasketSentence = {
  kind: "sentence",
  id: "s1",
  text: "毎朝コーヒーを飲みます。",
  translation: "I drink coffee every morning.",
  reading: null,
  source: "bank",
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
    starredVocab.mockReturnValue([]);
    updateVocabMutate.mockClear();
    updateStartMutate.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders nothing when empty", () => {
    const {
      container,
    } = renderWithQuery(<Basket />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the collapsed pill with a count", () => {
    useBasketStore.setState({
      items: [sentence],
      expanded: false,
    });
    renderWithQuery(<Basket />);
    expect(screen.getByRole("button", {
      name: "Open basket (1)",
    })).toBeInTheDocument();
  });

  it("shows grouped sections and the grammar construction cue when expanded", () => {
    useBasketStore.setState({
      items: [sentence, grammar],
      expanded: true,
    });
    renderWithQuery(<Basket />);
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
    } = renderWithQuery(<Basket />);
    expect(container).toBeEmptyDOMElement();
  });

  it("clears the basket from the header without confirming when nothing is server-backed", () => {
    const confirm = vi.fn((_message?: string) => true);
    vi.stubGlobal("confirm", confirm);
    useBasketStore.setState({
      items: [sentence],
      expanded: true,
    });
    renderWithQuery(<Basket />);
    fireEvent.click(screen.getByRole("button", {
      name: "Clear",
    }));
    expect(confirm).not.toHaveBeenCalled();
    expect(useBasketStore.getState().items).toHaveLength(0);
  });

  it("lists server-backed vocab alongside the local items", () => {
    starredVocab.mockReturnValue([{
      id: "v1",
      term: "毎朝",
      reading: "まいあさ",
      meaning: "every morning",
      starred: true,
    }]);
    useBasketStore.setState({
      items: [sentence],
      expanded: true,
    });
    renderWithQuery(<Basket />);
    expect(screen.getByText("Vocabulary (1)")).toBeInTheDocument();
    expect(screen.getByText("毎朝")).toBeInTheDocument();
  });

  it("confirms before clearing when the basket holds server-backed items, and un-stars them", () => {
    const confirm = vi.fn((_message?: string) => true);
    vi.stubGlobal("confirm", confirm);
    starredVocab.mockReturnValue([{
      id: "v1",
      term: "毎朝",
      reading: null,
      meaning: null,
      starred: true,
    }]);
    useBasketStore.setState({
      items: [sentence],
      expanded: true,
    });
    renderWithQuery(<Basket />);
    fireEvent.click(screen.getByRole("button", {
      name: "Clear",
    }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0]?.[0]).toContain("1 item is");
    expect(updateVocabMutate).toHaveBeenCalledWith({
      id: "v1",
      input: {
        starred: false,
      },
    });
  });

  it("keeps everything when the clear confirmation is declined", () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    starredVocab.mockReturnValue([{
      id: "v1",
      term: "毎朝",
      reading: null,
      meaning: null,
      starred: true,
    }]);
    useBasketStore.setState({
      items: [sentence],
      expanded: true,
    });
    renderWithQuery(<Basket />);
    fireEvent.click(screen.getByRole("button", {
      name: "Clear",
    }));
    expect(updateVocabMutate).not.toHaveBeenCalled();
    expect(useBasketStore.getState().items).toHaveLength(1);
  });

  it("sends sentences to practice and removes them from the basket", () => {
    createPracticeMutate.mockClear();
    useBasketStore.setState({
      items: [sentence, grammar],
      expanded: true,
    });
    renderWithQuery(<Basket />);
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

  it("sends every saved sentence kind to a shadowing list, but not AI-lesson source sentences", () => {
    updateListMutate.mockClear();
    const mine: BasketSentence = {
      ...sentence,
      id: "s2",
      source: "mine",
    };
    const fromLesson: BasketSentence = {
      ...sentence,
      id: "s3",
      source: "ai-lesson",
    };
    // No `source` at all — persisted before the field existed, so provenance is unknown.
    const legacy: BasketSentence = {
      ...sentence,
      id: "s4",
      source: undefined,
    };
    useBasketStore.setState({
      items: [sentence, mine, fromLesson, legacy],
      expanded: true,
    });
    renderWithQuery(<Basket />);
    fireEvent.click(screen.getByRole("button", {
      name: "To list",
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Morning drill",
    }));
    // A list holds Sentence ids of any kind, so bank and mine both qualify; the AI-lesson row and the
    // unknown-provenance row would never resolve.
    expect(updateListMutate.mock.calls[0]?.[0]).toEqual({
      id: "l1",
      input: {
        sentenceIds: ["s1", "s2"],
      },
    });
  });
});

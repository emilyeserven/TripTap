import type { BasketGrammar, BasketSentence, BasketVocab } from "./basketStore";

import { beforeEach, describe, expect, it } from "vitest";

import { basketKey, useBasketStore } from "./basketStore";

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
  note: "…",
  examples: [{
    jp: "行きたいんですが",
    en: "I'd like to go, but…",
  }],
};

describe("basketStore", () => {
  beforeEach(() => {
    useBasketStore.setState({
      items: [],
      expanded: false,
    });
  });

  it("adds items and opens on the first add", () => {
    useBasketStore.getState().add(sentence);
    const state = useBasketStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.expanded).toBe(true);
  });

  it("ignores a duplicate of the same kind+id", () => {
    const {
      add,
    } = useBasketStore.getState();
    add(sentence);
    add(sentence);
    expect(useBasketStore.getState().items).toHaveLength(1);
  });

  it("keys separately across kinds sharing an id", () => {
    const vocab: BasketVocab = {
      kind: "vocab",
      id: "s1",
      term: "毎朝",
      reading: "まいあさ",
      meaning: "every morning",
    };
    const {
      add,
    } = useBasketStore.getState();
    add(sentence);
    add(vocab);
    // Same raw id "s1", different kind → both kept.
    expect(useBasketStore.getState().items).toHaveLength(2);
  });

  it("removes by composite key", () => {
    const {
      add, remove,
    } = useBasketStore.getState();
    add(sentence);
    add(grammar);
    remove(basketKey("sentence", "s1"));
    const items = useBasketStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe("grammar");
  });

  it("clears every item", () => {
    const {
      add, clear,
    } = useBasketStore.getState();
    add(sentence);
    add(grammar);
    clear();
    expect(useBasketStore.getState().items).toHaveLength(0);
  });
});

// @vitest-environment node
import type { Vocab, VocabItem, WithAiLesson } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import type { VocabFilters } from "./vocab-filter";

import { filterAiLessonVocab, filterBankVocab, noAiLessonNarrowing } from "./vocab-filter";

const ALL: VocabFilters = {
  search: "",
  scope: "all",
  aiLesson: "all",
  level: "all",
  category: "all",
  renshuu: "all",
};

// Fixtures only carry the fields the filters read; the full wire types are much wider.
function bankWord(over: { id: string;
  term: string;
  reading?: string | null;
  meaning?: string | null; }): Vocab {
  return {
    reading: null,
    meaning: null,
    tags: null,
    notes: null,
    ...over,
  } as unknown as Vocab;
}

function lessonWord(over: {
  id: string;
  jp: string;
  aiLessonSlug?: string;
  lvl?: string;
  cat?: string;
  renshuuAdded?: boolean;
}): WithAiLesson<VocabItem> {
  return {
    yomi: "",
    en: "",
    aiLessonSlug: "lesson-1",
    lvl: "N5",
    cat: "noun",
    renshuuAdded: false,
    ...over,
  } as unknown as WithAiLesson<VocabItem>;
}

const bank = [bankWord({
  id: "b1",
  term: "猫",
  meaning: "cat",
})];
const items = [
  lessonWord({
    id: "l1",
    jp: "犬",
    renshuuAdded: true,
  }),
  lessonWord({
    id: "l2",
    jp: "鳥",
    aiLessonSlug: "lesson-2",
    lvl: "N4",
  }),
];

describe("noAiLessonNarrowing", () => {
  it("is true only when every lesson refinement is 'all'", () => {
    expect(noAiLessonNarrowing(ALL)).toBe(true);
    expect(noAiLessonNarrowing({
      ...ALL,
      level: "N5",
    })).toBe(false);
  });
});

describe("filterBankVocab", () => {
  it("shows the bank by default and applies the text search", () => {
    expect(filterBankVocab(bank, ALL)).toHaveLength(1);
    expect(filterBankVocab(bank, {
      ...ALL,
      search: "cat",
    })).toHaveLength(1);
    expect(filterBankVocab(bank, {
      ...ALL,
      search: "dog",
    })).toHaveLength(0);
  });

  it("hides the bank for the lessons scope or any lesson refinement", () => {
    expect(filterBankVocab(bank, {
      ...ALL,
      scope: "lessons",
    })).toHaveLength(0);
    expect(filterBankVocab(bank, {
      ...ALL,
      renshuu: "in",
    })).toHaveLength(0);
  });

  it("keeps the bank under a lesson refinement when the scope is explicitly 'yours'", () => {
    expect(filterBankVocab(bank, {
      ...ALL,
      scope: "yours",
      level: "N5",
    })).toHaveLength(1);
  });
});

describe("filterAiLessonVocab", () => {
  it("hides lesson vocab for the 'yours' scope", () => {
    expect(filterAiLessonVocab(items, {
      ...ALL,
      scope: "yours",
    })).toHaveLength(0);
  });

  it("applies each refinement", () => {
    expect(filterAiLessonVocab(items, {
      ...ALL,
      aiLesson: "lesson-2",
    }).map(v => v.id)).toEqual(["l2"]);
    expect(filterAiLessonVocab(items, {
      ...ALL,
      level: "N4",
    }).map(v => v.id)).toEqual(["l2"]);
    expect(filterAiLessonVocab(items, {
      ...ALL,
      renshuu: "in",
    }).map(v => v.id)).toEqual(["l1"]);
    expect(filterAiLessonVocab(items, {
      ...ALL,
      renshuu: "not",
    }).map(v => v.id)).toEqual(["l2"]);
  });

  it("applies the text search over jp/yomi/en", () => {
    expect(filterAiLessonVocab(items, {
      ...ALL,
      search: "犬",
    }).map(v => v.id)).toEqual(["l1"]);
  });
});

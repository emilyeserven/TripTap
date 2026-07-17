// @vitest-environment node
import type {
  Sentence,
  SentenceTermRef,
  SourceSentenceItem,
  WithAiLesson,
} from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import { dedupeGrammarTags, sentencesByGrammarTagId } from "./grammar-links";

function term(over: Partial<SentenceTermRef>): SentenceTermRef {
  return {
    id: "t-1",
    name: "は vs が",
    kind: "tag",
    sourceId: "src-1",
    sourceLabel: "Grammar",
    category: "grammar",
    ...over,
  };
}

// Fixtures only carry the fields the helpers read; the full wire types are much wider.
function sentence(over: { id: string;
  text: string;
  translation?: string | null;
  terms?: SentenceTermRef[]; }): Sentence {
  return {
    translation: null,
    terms: [],
    ...over,
  } as unknown as Sentence;
}

function aiSentence(over: {
  id: string;
  jp: string;
  en: string;
  aiLessonTitle: string;
  grammarTerms?: SentenceTermRef[] | null;
}): WithAiLesson<SourceSentenceItem> {
  return {
    grammarTerms: null,
    ...over,
  } as unknown as WithAiLesson<SourceSentenceItem>;
}

describe("dedupeGrammarTags", () => {
  it("dedupes by id, keeping the first occurrence, sorted by name", () => {
    const deduped = dedupeGrammarTags([
      term({
        id: "b",
        name: "te-form",
      }),
      term({
        id: "a",
        name: "は vs が",
      }),
      term({
        id: "b",
        name: "te-form (dupe)",
      }),
    ]);
    expect(deduped.map(t => t.id)).toEqual(["b", "a"]);
    expect(deduped.map(t => t.name)).toEqual(["te-form", "は vs が"]);
  });

  it("returns an empty list unchanged", () => {
    expect(dedupeGrammarTags([])).toEqual([]);
  });
});

describe("sentencesByGrammarTagId", () => {
  it("groups manual and AI-lesson sentences under their grammar tag ids", () => {
    const manual = [
      sentence({
        id: "s-1",
        text: "猫がいる",
        translation: "There is a cat",
        terms: [term({
          id: "tag-1",
        })],
      }),
      // A vocabulary-channel term must not create a grammar link.
      sentence({
        id: "s-2",
        text: "无関係",
        terms: [term({
          id: "tag-1",
          category: "vocabulary",
        })],
      }),
    ];
    const ai = [
      aiSentence({
        id: "ai-1",
        jp: "犬もいる",
        en: "There is also a dog",
        aiLessonTitle: "Pets",
        grammarTerms: [term({
          id: "tag-1",
        }), term({
          id: "tag-2",
        })],
      }),
    ];

    const map = sentencesByGrammarTagId(manual, ai);

    expect([...map.keys()].sort()).toEqual(["tag-1", "tag-2"]);
    expect(map.get("tag-1")).toEqual([
      {
        id: "s-1",
        text: "猫がいる",
        translation: "There is a cat",
      },
      {
        id: "ai-1",
        text: "犬もいる",
        translation: "There is also a dog",
        aiLessonTitle: "Pets",
      },
    ]);
    expect(map.get("tag-2")).toEqual([
      {
        id: "ai-1",
        text: "犬もいる",
        translation: "There is also a dog",
        aiLessonTitle: "Pets",
      },
    ]);
  });

  it("returns an empty map when nothing is tagged", () => {
    expect(sentencesByGrammarTagId([sentence({
      id: "s",
      text: "x",
    })], []).size).toBe(0);
  });
});

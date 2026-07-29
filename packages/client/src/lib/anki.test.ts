import type { ChunkCard, ContrastPair } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import {
  furiganaReading,
  isAnkiSentenceEligible,
  toAnkiChunkText,
  toAnkiContrastText,
  toAnkiSentenceText,
  toAnkiVocabText,
} from "./anki";

describe("isAnkiSentenceEligible", () => {
  it("requires both an expression and a meaning", () => {
    expect(isAnkiSentenceEligible({
      text: "犬",
      translation: "dog",
    })).toBe(true);
    expect(isAnkiSentenceEligible({
      text: "犬",
      translation: null,
    })).toBe(false);
    expect(isAnkiSentenceEligible({
      text: "犬",
      translation: "   ",
    })).toBe(false);
    expect(isAnkiSentenceEligible({
      text: "  ",
      translation: "dog",
    })).toBe(false);
  });
});

describe("furiganaReading", () => {
  it("uses the ruby reading for kanji runs and the base text otherwise", () => {
    expect(furiganaReading([
      {
        t: "毎朝",
        r: "まいあさ",
      },
      {
        t: "コーヒー",
        r: null,
      },
      {
        t: "を",
        r: null,
      },
    ])).toBe("まいあさコーヒーを");
  });

  it("returns an empty string when there is no segmentation", () => {
    expect(furiganaReading(null)).toBe("");
  });
});

describe("toAnkiSentenceText", () => {
  it("joins tab-separated expression/meaning/reading notes and skips rows without a meaning", () => {
    const text = toAnkiSentenceText([
      {
        text: "毎朝コーヒーを飲む",
        translation: "I drink coffee every morning",
        reading: "まいあさコーヒーをのむ",
      },
      {
        text: "犬",
        translation: null,
      },
      {
        text: "  好き  ",
        translation: "  like  ",
      },
    ]);
    expect(text).toBe(
      "毎朝コーヒーを飲む\tI drink coffee every morning\tまいあさコーヒーをのむ\n好き\tlike\t",
    );
  });

  it("collapses internal newlines so a field cannot split a note across rows", () => {
    expect(toAnkiSentenceText([{
      text: "line one\nline two",
      translation: "a\tb",
    }])).toBe("line one line two\ta b\t");
  });

  it("returns an empty string when nothing is eligible", () => {
    expect(toAnkiSentenceText([{
      text: "犬",
      translation: null,
    }])).toBe("");
  });
});

describe("toAnkiVocabText", () => {
  it("joins term/reading/meaning notes and skips empty terms", () => {
    const text = toAnkiVocabText([
      {
        term: "行く",
        reading: "いく",
        meaning: "to go",
      },
      {
        term: "犬",
        reading: null,
        meaning: "dog",
      },
      {
        term: "  ",
        reading: "x",
        meaning: "y",
      },
    ]);
    expect(text).toBe("行く\tいく\tto go\n犬\t\tdog");
  });
});

const WRONG_FORM = "デンキヲケシマシタ_WRONG";

function contrastPair(): ContrastPair {
  return {
    id: "p1",
    a: {
      jp: "電気を消す",
      en: "turn the light off",
    },
    b: {
      jp: "電気が消える",
      en: "the light goes out",
    },
    options: ["消す", "消える"],
  };
}

function chunkCard(overrides: Partial<ChunkCard> = {}): ChunkCard {
  return {
    id: "c1",
    correctionId: null,
    batchId: "b1",
    chunk: "お風呂に入る",
    gloss: "take a bath",
    format: "situation_production",
    prompt: "Say that you take a bath.",
    answer: "お風呂に入る",
    wrongForm: WRONG_FORM,
    createdAt: "2026-01-01T00:00:00.000Z",
    exportedAt: null,
    ...overrides,
  };
}

describe("toAnkiContrastText", () => {
  it("emits one 4-column note per pair with both options on each front (inv.4)", () => {
    const cols = toAnkiContrastText([contrastPair()]).split("\t");
    expect(cols).toHaveLength(4);
    expect(cols[0]).toContain("消す");
    expect(cols[0]).toContain("消える");
    expect(cols[2]).toContain("消す");
    expect(cols[2]).toContain("消える");
    expect(cols[1]).toBe("電気を消す");
    expect(cols[3]).toBe("電気が消える");
  });
});

describe("toAnkiChunkText", () => {
  it("emits front⇥back and never the wrong form (spec §6 inv.3)", () => {
    const text = toAnkiChunkText([chunkCard()]);
    expect(text).toBe("Say that you take a bath.\tお風呂に入る");
    expect(text).not.toContain(WRONG_FORM);
  });

  it("skips cards missing a prompt or answer", () => {
    expect(toAnkiChunkText([chunkCard({
      prompt: "",
    })])).toBe("");
    expect(toAnkiChunkText([chunkCard({
      answer: "  ",
    })])).toBe("");
  });
});

// The banned "wrong → right" card format: no exported card face may carry the learner's error.
describe("no exported card face carries the learner's wrong form (spec §6 inv.3)", () => {
  it("holds across contrast and chunk exports", () => {
    expect(toAnkiContrastText([contrastPair()])).not.toContain(WRONG_FORM);
    expect(toAnkiChunkText([chunkCard()])).not.toContain(WRONG_FORM);
  });
});

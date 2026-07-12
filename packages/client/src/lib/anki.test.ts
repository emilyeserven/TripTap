import { describe, expect, it } from "vitest";

import { furiganaReading, isAnkiSentenceEligible, toAnkiSentenceText, toAnkiVocabText } from "./anki";

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

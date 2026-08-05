import { describe, expect, it } from "vitest";

import { isRenshuuEligible, toRenshuuText, toRenshuuVocabText } from "./renshuu";

describe("isRenshuuEligible", () => {
  it("requires both a Japanese line and a translation", () => {
    expect(isRenshuuEligible({
      text: "犬",
      translation: "dog",
    })).toBe(true);
    expect(isRenshuuEligible({
      text: "犬",
      translation: null,
    })).toBe(false);
    expect(isRenshuuEligible({
      text: "犬",
      translation: "   ",
    })).toBe(false);
    expect(isRenshuuEligible({
      text: "  ",
      translation: "dog",
    })).toBe(false);
  });
});

describe("toRenshuuText", () => {
  it("joins tab-separated jp/en lines and skips rows without a translation", () => {
    const text = toRenshuuText([
      {
        text: "毎朝コーヒーを飲む",
        translation: "I drink coffee every morning",
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
    expect(text).toBe("毎朝コーヒーを飲む\tI drink coffee every morning\n好き\tlike");
  });

  it("returns an empty string when nothing is eligible", () => {
    expect(toRenshuuText([{
      text: "犬",
      translation: null,
    }])).toBe("");
  });

  it("collapses embedded newlines and tabs so one row can't split into two", () => {
    const text = toRenshuuText([
      {
        text: "毎朝\nコーヒーを飲む",
        translation: "I drink\tcoffee",
      },
      {
        text: "犬",
        translation: "dog",
      },
    ]);
    expect(text).toBe("毎朝 コーヒーを飲む\tI drink coffee\n犬\tdog");
    expect(text.split("\n")).toHaveLength(2);
  });
});

describe("toRenshuuVocabText", () => {
  it("joins term/reading lines, bare term when no reading, skipping empty terms", () => {
    const text = toRenshuuVocabText([
      {
        term: "行く",
        reading: "いく",
      },
      {
        term: "犬",
        reading: null,
      },
      {
        term: "  好き  ",
        reading: "  すき  ",
      },
      {
        term: "  ",
        reading: "x",
      },
    ]);
    expect(text).toBe("行く/いく\n犬\n好き/すき");
  });

  it("collapses embedded newlines so one term can't split into two rows", () => {
    const text = toRenshuuVocabText([
      {
        term: "食べ\nる",
        reading: "たべる",
      },
    ]);
    expect(text).toBe("食べ る/たべる");
    expect(text.split("\n")).toHaveLength(1);
  });
});

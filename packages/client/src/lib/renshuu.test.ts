import { describe, expect, it } from "vitest";

import { isRenshuuEligible, toRenshuuText } from "./renshuu";

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
});

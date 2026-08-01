// @vitest-environment node
import type { WritingCorrection } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import { correctedText, isUnchanged, splitLines, splitSentences } from "./writing-corrections";

describe("splitSentences", () => {
  it("splits on Japanese and Latin terminal punctuation", () => {
    expect(splitSentences("猫がいる。犬もいる！鳥は？")).toEqual(["猫がいる。", "犬もいる！", "鳥は？"]);
    expect(splitSentences("One. Two! Three?")).toEqual(["One.", "Two!", "Three?"]);
  });

  it("treats an unpunctuated line as one sentence", () => {
    expect(splitSentences("句点なしの文\n次の行")).toEqual(["句点なしの文", "次の行"]);
  });

  it("keeps a trailing unpunctuated fragment on a punctuated line", () => {
    expect(splitSentences("終わった。まだ続く")).toEqual(["終わった。", "まだ続く"]);
  });

  it("skips blank lines and returns empty for empty input", () => {
    expect(splitSentences("一行目。\n\n\n二行目。")).toEqual(["一行目。", "二行目。"]);
    expect(splitSentences("")).toEqual([]);
    expect(splitSentences("   \n  ")).toEqual([]);
  });

  it("collapses runs of punctuation into one boundary", () => {
    expect(splitSentences("えっ！？そうなの。")).toEqual(["えっ！？", "そうなの。"]);
  });
});

describe("splitLines", () => {
  it("keeps a whole line as one segment regardless of terminal punctuation", () => {
    expect(splitLines("猫がいる。犬もいる！鳥は？")).toEqual(["猫がいる。犬もいる！鳥は？"]);
    expect(splitLines("One. Two! Three?")).toEqual(["One. Two! Three?"]);
  });

  it("does not break a line on dots inside a token", () => {
    expect(
      splitLines("honto.jpは「試し読み」の機能があります。本を買う前に、少し読めます。"),
    ).toEqual(["honto.jpは「試し読み」の機能があります。本を買う前に、少し読めます。"]);
  });

  it("detects a new sentence only on a new line", () => {
    expect(splitLines("句点なしの文\n次の行")).toEqual(["句点なしの文", "次の行"]);
    expect(splitLines("一行目。\n二行目。")).toEqual(["一行目。", "二行目。"]);
  });

  it("skips blank lines and returns empty for empty input", () => {
    expect(splitLines("一行目。\n\n\n二行目。")).toEqual(["一行目。", "二行目。"]);
    expect(splitLines("")).toEqual([]);
    expect(splitLines("   \n  ")).toEqual([]);
  });
});

function correction(over: Partial<WritingCorrection> = {}): WritingCorrection {
  return {
    id: "c1",
    original: "猫がいる。",
    corrected: "猫がいます。",
    note: null,
    marks: null,
    mySentenceId: null,
    ...over,
  };
}

describe("correctedText", () => {
  it("returns the fix when there is one", () => {
    expect(correctedText(correction())).toBe("猫がいます。");
  });

  it("falls back to the original for a 'no change needed' entry", () => {
    expect(correctedText(correction({
      corrected: "",
    }))).toBe("猫がいる。");
    expect(correctedText(correction({
      corrected: "   ",
    }))).toBe("猫がいる。");
  });
});

describe("isUnchanged", () => {
  it("is true for an empty correction", () => {
    expect(isUnchanged(correction({
      corrected: "",
    }))).toBe(true);
  });

  it("is true when the correction only differs by surrounding whitespace", () => {
    expect(isUnchanged(correction({
      corrected: " 猫がいる。 ",
    }))).toBe(true);
  });

  it("is false for a real fix", () => {
    expect(isUnchanged(correction())).toBe(false);
  });
});

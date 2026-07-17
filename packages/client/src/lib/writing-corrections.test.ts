// @vitest-environment node
import { describe, expect, it } from "vitest";

import { splitSentences } from "./writing-corrections";

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

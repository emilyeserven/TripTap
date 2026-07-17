// @vitest-environment node
import { describe, expect, it } from "vitest";

import { partLabel, toLetters, toRoman } from "./question-sheet-parts";

describe("toRoman", () => {
  it("converts small numbers", () => {
    expect(toRoman(1)).toBe("i");
    expect(toRoman(4)).toBe("iv");
    expect(toRoman(9)).toBe("ix");
  });

  it("converts compound numbers", () => {
    expect(toRoman(14)).toBe("xiv");
    expect(toRoman(40)).toBe("xl");
    expect(toRoman(1987)).toBe("mcmlxxxvii");
  });
});

describe("toLetters", () => {
  it("maps 0-based indexes to letters", () => {
    expect(toLetters(0)).toBe("a");
    expect(toLetters(25)).toBe("z");
  });

  it("rolls over to two-letter sequences like a spreadsheet", () => {
    expect(toLetters(26)).toBe("aa");
    expect(toLetters(27)).toBe("ab");
    expect(toLetters(51)).toBe("az");
    expect(toLetters(52)).toBe("ba");
  });
});

describe("partLabel", () => {
  it("builds a label for each style from a 0-based index", () => {
    expect(partLabel("letter", 2)).toBe("(c)");
    expect(partLabel("number", 2)).toBe("(3)");
    expect(partLabel("roman", 2)).toBe("(iii)");
  });
});

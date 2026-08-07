// @vitest-environment node
import { describe, expect, it } from "vitest";

import { expandLabelRange, partLabel, questionLabel, toLetters, toRoman } from "./question-sheet-parts";

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

describe("questionLabel", () => {
  it("builds a plain (un-parenthesised) label for each style from a 0-based index", () => {
    expect([0, 1, 2].map(i => questionLabel("decimal", i))).toEqual(["1", "2", "3"]);
    expect([0, 1, 2].map(i => questionLabel("upper-alpha", i))).toEqual(["A", "B", "C"]);
    expect([0, 1, 2].map(i => questionLabel("lower-alpha", i))).toEqual(["a", "b", "c"]);
    expect([0, 1, 2].map(i => questionLabel("upper-roman", i))).toEqual(["I", "II", "III"]);
    expect([0, 1, 2].map(i => questionLabel("lower-roman", i))).toEqual(["i", "ii", "iii"]);
  });
});

describe("expandLabelRange", () => {
  it("expands lowercase and uppercase letter ranges", () => {
    expect(expandLabelRange("a-e")).toEqual(["a", "b", "c", "d", "e"]);
    expect(expandLabelRange("A-E")).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("expands numeric ranges (multi-digit)", () => {
    expect(expandLabelRange("1-5")).toEqual(["1", "2", "3", "4", "5"]);
    expect(expandLabelRange("9-11")).toEqual(["9", "10", "11"]);
  });

  it("tolerates spaces and an en-dash", () => {
    expect(expandLabelRange("  a – c ")).toEqual(["a", "b", "c"]);
  });

  it("rejects reversed, mismatched, or malformed ranges", () => {
    expect(expandLabelRange("e-a")).toBeNull();
    expect(expandLabelRange("a-C")).toBeNull(); // mixed case
    expect(expandLabelRange("a-5")).toBeNull(); // letter vs number
    expect(expandLabelRange("abc")).toBeNull();
    expect(expandLabelRange("")).toBeNull();
  });

  it("rejects ranges over the cap", () => {
    expect(expandLabelRange("1-100")).toBeNull();
  });
});

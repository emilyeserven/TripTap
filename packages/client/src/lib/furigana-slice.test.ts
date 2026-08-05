// @vitest-environment node
import type { FuriToken } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import { sliceFuriTokens } from "./furigana-slice";

/** 毎朝(まいあさ) コーヒーを 飲(の) みます。 — concatenating `t` gives "毎朝コーヒーを飲みます。" */
const TOKENS: FuriToken[] = [
  {
    t: "毎朝",
    r: "まいあさ",
  },
  {
    t: "コーヒーを",
    r: null,
  },
  {
    t: "飲",
    r: "の",
  },
  {
    t: "みます。",
    r: null,
  },
];

const TEXT = TOKENS.map(t => t.t).join("");

describe("sliceFuriTokens", () => {
  it("returns the whole list for the full range", () => {
    expect(sliceFuriTokens(TOKENS, 0, TEXT.length)).toEqual(TOKENS);
  });

  it("keeps a reading when the slice lands on token boundaries", () => {
    // "毎朝" exactly.
    expect(sliceFuriTokens(TOKENS, 0, 2)).toEqual([{
      t: "毎朝",
      r: "まいあさ",
    }]);
    // "飲みます。" — the kanji keeps its reading, the okurigana stays plain.
    expect(sliceFuriTokens(TOKENS, 7, TEXT.length)).toEqual([
      {
        t: "飲",
        r: "の",
      },
      {
        t: "みます。",
        r: null,
      },
    ]);
  });

  it("drops the reading of a token split mid-run rather than mis-aligning it", () => {
    // Cutting "毎朝" in half can't split まいあさ meaningfully, so that run renders plain.
    expect(sliceFuriTokens(TOKENS, 0, 1)).toEqual([{
      t: "毎",
      r: null,
    }]);
    expect(sliceFuriTokens(TOKENS, 1, 2)).toEqual([{
      t: "朝",
      r: null,
    }]);
  });

  it("slices across several tokens, trimming only the straddling ends", () => {
    // From mid-"毎朝" through mid-"コーヒーを".
    expect(sliceFuriTokens(TOKENS, 1, 4)).toEqual([
      {
        t: "朝",
        r: null,
      },
      {
        t: "コー",
        r: null,
      },
    ]);
  });

  it("reproduces the sliced text exactly, whatever the boundaries", () => {
    for (let start = 0; start < TEXT.length; start += 1) {
      for (let end = start + 1; end <= TEXT.length; end += 1) {
        const sliced = sliceFuriTokens(TOKENS, start, end) ?? [];
        expect(sliced.map(t => t.t).join("")).toBe(TEXT.slice(start, end));
      }
    }
  });

  it("returns null for an empty range or no tokens", () => {
    expect(sliceFuriTokens(TOKENS, 2, 2)).toBeNull();
    expect(sliceFuriTokens(TOKENS, 3, 1)).toBeNull();
    expect(sliceFuriTokens(null, 0, 5)).toBeNull();
    expect(sliceFuriTokens([], 0, 5)).toBeNull();
  });
});

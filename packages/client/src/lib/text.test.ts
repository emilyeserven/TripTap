import { describe, expect, it } from "vitest";

import { countWords } from "./text";

describe("countWords", () => {
  it("counts whitespace-delimited words", () => {
    expect(countWords("one two three")).toBe(3);
    expect(countWords("word")).toBe(1);
  });

  it("ignores leading, trailing, and repeated whitespace", () => {
    expect(countWords("   spaced   out   words  ")).toBe(3);
    expect(countWords("tabs\tand\nnewlines\r\nhere")).toBe(4);
  });

  it("counts an empty or whitespace-only string as zero", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("    ")).toBe(0);
    expect(countWords("\n\t")).toBe(0);
  });
});

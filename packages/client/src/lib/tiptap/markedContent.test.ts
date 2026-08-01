import type { JSONContent } from "@tiptap/react";

import { describe, expect, it } from "vitest";

import { markedContent } from "./markedContent";

/** Flatten a doc's paragraph text nodes to `[text, isCorrect]` pairs. */
function segments(doc: JSONContent): [string, boolean][] {
  const nodes = doc.content?.[0]?.content ?? [];
  return nodes.map(n => [n.text ?? "", (n.marks ?? []).some(m => m.type === "correct")]);
}

describe("markedContent", () => {
  it("wraps the marked spans in a correct mark and leaves the rest plain", () => {
    // "電気が消える" with 消える (index 3–6) affirmed correct.
    const doc = markedContent("電気が消える", [{
      start: 3,
      end: 6,
      correct: true,
    }]);
    expect(segments(doc)).toEqual([
      ["電気が", false],
      ["消える", true],
    ]);
  });

  it("ignores incorrect / empty marks and produces plain text", () => {
    const doc = markedContent("電気が消える", [
      {
        start: 0,
        end: 3,
        correct: false,
      },
      {
        start: 4,
        end: 4,
        correct: true,
      },
    ]);
    expect(segments(doc)).toEqual([["電気が消える", false]]);
  });

  it("handles no marks and empty text", () => {
    expect(segments(markedContent("犬", []))).toEqual([["犬", false]]);
    // Empty text → an empty paragraph (no text nodes).
    expect(markedContent("", []).content?.[0]?.content).toBeUndefined();
  });
});

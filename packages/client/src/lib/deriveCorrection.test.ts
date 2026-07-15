import type { JSONContent } from "@tiptap/core";

import { describe, expect, it } from "vitest";

import { deriveCorrection } from "./deriveCorrection";

/** Wrap inline nodes in a single-paragraph doc, the shape TipTap produces for a one-line sentence. */
function doc(...inline: JSONContent[]): JSONContent {
  return {
    type: "doc",
    content: [{
      type: "paragraph",
      content: inline,
    }],
  };
}

function text(value: string, ...markTypes: string[]): JSONContent {
  return {
    type: "text",
    text: value,
    ...(markTypes.length
      ? {
        marks: markTypes.map(type => ({
          type,
        })),
      }
      : {}),
  };
}

describe("deriveCorrection", () => {
  it("passes plain text through unchanged with no marks", () => {
    expect(deriveCorrection(doc(text("neko ga suki")))).toEqual({
      correction: "neko ga suki",
      marks: [],
    });
  });

  it("drops an incorrect-marked span from the result", () => {
    expect(deriveCorrection(doc(
      text("neko ga "),
      text("suki", "incorrect"),
      text("daisuki"),
    ))).toEqual({
      correction: "neko ga daisuki",
      marks: [],
    });
  });

  it("keeps a correct-marked span and records it at its derived offset", () => {
    // "neko" (correct) + " ga suki" → correction "neko ga suki", mark over [0,4).
    expect(deriveCorrection(doc(
      text("neko", "correct"),
      text(" ga suki"),
    ))).toEqual({
      correction: "neko ga suki",
      marks: [{
        start: 0,
        end: 4,
        correct: true,
      }],
    });
  });

  it("keeps typed insertions (plain text) and offsets correct marks past a dropped span", () => {
    expect(deriveCorrection(doc(
      text("a "),
      text("bad", "incorrect"),
      text("good", "correct"),
    ))).toEqual({
      correction: "a good",
      marks: [{
        start: 2,
        end: 6,
        correct: true,
      }],
    });
  });

  it("joins multiple blocks and hard breaks with newlines", () => {
    const twoBlocks: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [text("line one")],
        },
        {
          type: "paragraph",
          content: [text("line two")],
        },
      ],
    };
    expect(deriveCorrection(twoBlocks).correction).toBe("line one\nline two");
  });

  it("returns an empty result for an empty doc", () => {
    expect(deriveCorrection(null)).toEqual({
      correction: "",
      marks: [],
    });
  });
});

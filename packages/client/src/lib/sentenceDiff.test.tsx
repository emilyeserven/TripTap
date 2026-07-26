import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CorrectionDiff } from "./sentenceDiff";

/**
 * Classify each rendered span by the styling `CorrectionDiff` gives added / removed / unchanged runs,
 * returning them in DOM order so a test can assert both the text and the correction semantics.
 */
function readSpans(container: HTMLElement): { text: string;
  kind: "added" | "removed" | "same"; }[] {
  const p = container.querySelector("p");
  if (!p) return [];
  return Array.from(p.querySelectorAll("span")).map((el) => {
    const cls = el.className;
    const kind = cls.includes("emerald") ? "added" : cls.includes("line-through") ? "removed" : "same";
    return {
      text: el.textContent ?? "",
      kind,
    };
  });
}

describe("CorrectionDiff", () => {
  it("renders nothing when the written sentence is empty or whitespace", () => {
    const blank = render(
      <CorrectionDiff
        written="   "
        correct="something"
      />,
    );
    expect(blank.container.querySelector("p")).toBeNull();
  });

  it("renders nothing when the correction is missing or empty", () => {
    expect(render(
      <CorrectionDiff
        written="hello"
        correct={null}
      />,
    ).container.querySelector("p")).toBeNull();
    expect(render(
      <CorrectionDiff
        written="hello"
        correct={undefined}
      />,
    ).container.querySelector("p")).toBeNull();
    expect(render(
      <CorrectionDiff
        written="hello"
        correct="   "
      />,
    ).container.querySelector("p")).toBeNull();
  });

  it("marks unchanged text plain and highlights an added word", () => {
    const {
      container,
    } = render(
      <CorrectionDiff
        written="I have cat"
        correct="I have a cat"
      />,
    );
    const spans = readSpans(container);
    // The shared prefix stays plain and the inserted "a " is highlighted as added.
    expect(spans.some(s => s.kind === "same" && s.text.includes("I have"))).toBe(true);
    expect(spans.some(s => s.kind === "added" && s.text.includes("a"))).toBe(true);
    expect(spans.some(s => s.kind === "removed")).toBe(false);
  });

  it("orders the corrected span before the struck-through original on a substitution", () => {
    const {
      container,
    } = render(
      <CorrectionDiff
        written="I like cat"
        correct="I like dog"
      />,
    );
    const spans = readSpans(container).filter(s => s.kind !== "same");
    // jsdiff emits removed-then-added; the component swaps each pair so the correction reads first.
    expect(spans.map(s => s.kind)).toEqual(["added", "removed"]);
    expect(spans[0].text).toContain("dog");
    expect(spans[1].text).toContain("cat");
  });

  it("uses a character diff for an explicit Japanese language name", () => {
    // A word diff of spaceless Japanese would replace the whole line; a char diff keeps 食 shared.
    const {
      container,
    } = render(
      <CorrectionDiff
        written="食べた"
        correct="食べる"
        language="Japanese"
      />,
    );
    const spans = readSpans(container);
    expect(spans.some(s => s.kind === "same" && s.text.includes("食べ"))).toBe(true);
    expect(spans.some(s => s.kind === "added" && s.text === "る")).toBe(true);
    expect(spans.some(s => s.kind === "removed" && s.text === "た")).toBe(true);
  });

  it("falls back to a character diff when CJK characters are present without a language hint", () => {
    const {
      container,
    } = render(
      <CorrectionDiff
        written="犬"
        correct="猫"
      />,
    );
    const spans = readSpans(container).filter(s => s.kind !== "same");
    // Char diff on a full substitution still reorders corrected-before-original.
    expect(spans.map(s => s.kind)).toEqual(["added", "removed"]);
    expect(spans[0].text).toBe("猫");
    expect(spans[1].text).toBe("犬");
  });
});

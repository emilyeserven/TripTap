// @vitest-environment node
import type { SentenceTermCategory, SentenceTermRef } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import { groupTermsByCategory, TERM_CATEGORIES, termCategory, termsChanged } from "./terms";

function term(id: string, category?: string): SentenceTermRef {
  return {
    id,
    name: `term-${id}`,
    kind: "tag",
    sourceId: "src",
    sourceLabel: "Source",
    // Deliberately widen so tests can pass legacy/retired category strings the runtime tolerates.
    category: category as SentenceTermCategory,
  };
}

describe("termCategory", () => {
  it("passes through each known channel unchanged", () => {
    for (const c of ["vocabulary", "grammar", "general", "resource"] as const) {
      expect(termCategory(term("x", c))).toBe(c);
    }
  });

  it("defaults a term with no category to vocabulary (pre-channels rows)", () => {
    expect(termCategory(term("x", undefined))).toBe("vocabulary");
  });

  it("folds a retired channel into resource so it still renders", () => {
    expect(termCategory(term("x", "listening"))).toBe("resource");
  });
});

describe("termsChanged", () => {
  it("is false for the same ids in a different order", () => {
    expect(termsChanged([term("a"), term("b")], [term("b"), term("a")])).toBe(false);
  });

  it("is true when the lengths differ", () => {
    expect(termsChanged([term("a")], [term("a"), term("b")])).toBe(true);
  });

  it("is true when an id is swapped out at equal length", () => {
    expect(termsChanged([term("a"), term("b")], [term("a"), term("c")])).toBe(true);
  });

  it("is false for two empty lists", () => {
    expect(termsChanged([], [])).toBe(false);
  });
});

describe("groupTermsByCategory", () => {
  it("buckets each term under its channel and leaves empty buckets present", () => {
    const groups = groupTermsByCategory([
      term("a", "vocabulary"),
      term("b", "grammar"),
      term("c", "grammar"),
    ]);
    expect(groups.vocabulary.map(t => t.id)).toEqual(["a"]);
    expect(groups.grammar.map(t => t.id)).toEqual(["b", "c"]);
    expect(groups.general).toEqual([]);
    expect(groups.resource).toEqual([]);
  });

  it("routes an unknown category into resource via termCategory's fallback", () => {
    const groups = groupTermsByCategory([term("a", "listening")]);
    expect(groups.resource.map(t => t.id)).toEqual(["a"]);
  });
});

describe("TERM_CATEGORIES", () => {
  it("lists the four channels in display order", () => {
    expect(TERM_CATEGORIES.map(c => c.category)).toEqual([
      "vocabulary",
      "grammar",
      "general",
      "resource",
    ]);
  });
});

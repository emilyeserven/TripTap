// @vitest-environment node
import type { SentenceTermCategory, SentenceTermRef } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import {
  groupTermsByCategory,
  replaceCategory,
  TERM_CATEGORIES,
  termCategory,
  termsChanged,
} from "./terms";

import { dedupeTerms, grammarTermsOf } from "@sentence-bank/types";

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

describe("replaceCategory", () => {
  it("swaps one channel's terms while preserving the others", () => {
    const terms = [term("v1", "vocabulary"), term("g1", "grammar"), term("r1", "resource")];
    const next = replaceCategory(terms, "grammar", [term("g2", "grammar")]);
    expect(next?.map(t => t.id).sort()).toEqual(["g2", "r1", "v1"]);
  });

  it("clears a channel without touching the rest", () => {
    const terms = [term("v1", "vocabulary"), term("g1", "grammar")];
    expect(replaceCategory(terms, "grammar", null)?.map(t => t.id)).toEqual(["v1"]);
  });

  it("returns null rather than an empty list when nothing is left", () => {
    expect(replaceCategory([term("g1", "grammar")], "grammar", [])).toBeNull();
    expect(replaceCategory(null, "grammar", null)).toBeNull();
  });

  it("treats a term with no category as vocabulary, so a grammar edit leaves it alone", () => {
    const next = replaceCategory([term("legacy")], "grammar", [term("g1", "grammar")]);
    expect(next?.map(t => t.id).sort()).toEqual(["g1", "legacy"]);
  });
});

describe("grammarTermsOf", () => {
  it("reads the grammar channel out of an all-channels terms list", () => {
    const entity = {
      terms: [term("v1", "vocabulary"), term("g1", "grammar"), term("g2", "grammar")],
    };
    expect(grammarTermsOf(entity).map(t => t.id)).toEqual(["g1", "g2"]);
  });

  it("reads a pre-split grammarTerms list as-is", () => {
    const entity = {
      grammarTerms: [term("g1", "grammar"), term("g2")],
    };
    expect(grammarTermsOf(entity).map(t => t.id)).toEqual(["g1", "g2"]);
  });

  it("prefers grammarTerms when an entity somehow carries both", () => {
    const entity = {
      terms: [term("g1", "grammar")],
      grammarTerms: [term("g2", "grammar")],
    };
    expect(grammarTermsOf(entity).map(t => t.id)).toEqual(["g2"]);
  });

  it("returns an empty list for an untagged entity, whichever field is absent", () => {
    expect(grammarTermsOf({})).toEqual([]);
    expect(grammarTermsOf({
      terms: null,
    })).toEqual([]);
    expect(grammarTermsOf({
      grammarTerms: [],
      terms: [term("v1", "vocabulary")],
    })).toEqual([]);
  });
});

describe("dedupeTerms", () => {
  it("keeps the first ref per id and sorts by name", () => {
    const deduped = dedupeTerms([term("b"), term("a"), term("b")]);
    expect(deduped.map(t => t.id)).toEqual(["a", "b"]);
  });
});

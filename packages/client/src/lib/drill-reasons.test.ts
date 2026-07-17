// @vitest-environment node
import type { DrillReasonCategory } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import { flattenReasons, resolveReasonRef } from "./drill-reasons";

function category(over: Partial<DrillReasonCategory>): DrillReasonCategory {
  return {
    id: "cat-1",
    name: "Grammar",
    subcategories: null,
    reasons: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

const taxonomy: DrillReasonCategory[] = [
  category({
    id: "cat-1",
    name: "Grammar",
    subcategories: [
      {
        id: "sub-1",
        name: "Verb conjugation",
        reasons: [{
          id: "r-1",
          name: "Wrong tense",
        }],
      },
    ],
    reasons: [{
      id: "r-2",
      name: "Particle mix-up",
    }],
  }),
  category({
    id: "cat-2",
    name: "Vocab",
    reasons: [{
      id: "r-3",
      name: "Wrong word",
    }],
  }),
];

describe("flattenReasons", () => {
  it("flattens subcategory and direct reasons with full paths", () => {
    const flat = flattenReasons(taxonomy);
    expect(flat).toHaveLength(3);
    expect(flat[0]).toMatchObject({
      subcategoryId: "sub-1",
      reasonId: "r-1",
      path: "Grammar › Verb conjugation › Wrong tense",
    });
    expect(flat[1]).toMatchObject({
      subcategoryId: null,
      reasonId: "r-2",
      path: "Grammar › Particle mix-up",
    });
    expect(flat[2]).toMatchObject({
      categoryId: "cat-2",
      reasonId: "r-3",
    });
  });

  it("returns an empty list for an empty taxonomy", () => {
    expect(flattenReasons([])).toEqual([]);
  });
});

describe("resolveReasonRef", () => {
  it("resolves a full category › subcategory › reason path", () => {
    const resolved = resolveReasonRef(taxonomy, {
      categoryId: "cat-1",
      subcategoryId: "sub-1",
      reasonId: "r-1",
    });
    expect(resolved).toEqual({
      categoryName: "Grammar",
      subcategoryName: "Verb conjugation",
      reasonName: "Wrong tense",
      label: "Grammar › Verb conjugation › Wrong tense",
    });
  });

  it("resolves a direct category reason with no subcategory", () => {
    const resolved = resolveReasonRef(taxonomy, {
      categoryId: "cat-1",
      reasonId: "r-2",
    });
    expect(resolved.label).toBe("Grammar › Particle mix-up");
    expect(resolved.subcategoryName).toBeNull();
  });

  it("labels a fully deleted reference as (deleted reason)", () => {
    const resolved = resolveReasonRef(taxonomy, {
      categoryId: "gone",
      subcategoryId: "gone-sub",
      reasonId: "gone-reason",
    });
    expect(resolved.label).toBe("(deleted reason)");
    expect(resolved.categoryName).toBeNull();
  });

  it("marks a partially resolved reference as (deleted) at the missing depth", () => {
    const resolved = resolveReasonRef(taxonomy, {
      categoryId: "cat-1",
      subcategoryId: "sub-1",
      reasonId: "deleted-leaf",
    });
    expect(resolved.label).toBe("Grammar › Verb conjugation › (deleted)");
    expect(resolved.reasonName).toBeNull();
  });

  it("resolves a category-only reference to just the category name", () => {
    const resolved = resolveReasonRef(taxonomy, {
      categoryId: "cat-2",
    });
    expect(resolved.label).toBe("Vocab");
  });
});

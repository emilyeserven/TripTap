// @vitest-environment node
import type { DrillReasonCategory } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import { flattenReasons, planReasonAddition, resolveReasonRef } from "./drill-reasons";

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

describe("planReasonAddition", () => {
  const reason = {
    id: "r-new",
    name: "Wrong particle",
  };
  const makeId = () => "generated-id";

  it("creates a new category holding the reason directly", () => {
    const plan = planReasonAddition({
      category: {
        kind: "new",
        name: " Grammar ",
      },
      sub: {
        kind: "none",
      },
    }, reason, makeId);
    expect(plan).toEqual({
      kind: "create",
      input: {
        name: "Grammar",
        reasons: [reason],
      },
      subId: null,
    });
  });

  it("creates a new category with a new subcategory holding the reason", () => {
    const plan = planReasonAddition({
      category: {
        kind: "new",
        name: "Grammar",
      },
      sub: {
        kind: "new",
        name: "Particles",
      },
    }, reason, makeId);
    expect(plan.kind).toBe("create");
    expect(plan.subId).toBe("generated-id");
    if (plan.kind === "create") {
      expect(plan.input.subcategories?.[0]).toMatchObject({
        id: "generated-id",
        name: "Particles",
        reasons: [reason],
      });
    }
  });

  it("attaches the reason directly to an existing category", () => {
    const category = taxonomy[1]; // "Vocab", one direct reason
    const plan = planReasonAddition({
      category: {
        kind: "existing",
        category,
      },
      sub: {
        kind: "none",
      },
    }, reason, makeId);
    expect(plan).toMatchObject({
      kind: "update",
      categoryId: "cat-2",
      subId: null,
    });
    if (plan.kind === "update") {
      expect(plan.input.reasons?.map(r => r.id)).toEqual(["r-3", "r-new"]);
    }
  });

  it("appends the reason to an existing subcategory", () => {
    const category = taxonomy[0]; // "Grammar" with sub-1
    const plan = planReasonAddition({
      category: {
        kind: "existing",
        category,
      },
      sub: {
        kind: "existing",
        id: "sub-1",
      },
    }, reason, makeId);
    expect(plan.subId).toBe("sub-1");
    if (plan.kind === "update") {
      const sub = plan.input.subcategories?.find(s => s.id === "sub-1");
      expect(sub?.reasons.map(r => r.id)).toEqual(["r-1", "r-new"]);
    }
  });

  it("adds a new subcategory to an existing category", () => {
    const category = taxonomy[0];
    const plan = planReasonAddition({
      category: {
        kind: "existing",
        category,
      },
      sub: {
        kind: "new",
        name: "Conjugation",
      },
    }, reason, makeId);
    expect(plan.subId).toBe("generated-id");
    if (plan.kind === "update") {
      expect(plan.input.subcategories?.map(s => s.id)).toEqual(["sub-1", "generated-id"]);
    }
  });
});

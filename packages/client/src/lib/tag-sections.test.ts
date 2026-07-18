import type { TagTermOption } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import { tagSectionOptions } from "./tag-sections";

// Mirrors the real Grammar tree: Grammar(root) → Verbs → Potential Form; し - Reasons is a leaf.
const NODES: TagTermOption[] = [
  {
    id: "verbs",
    name: "Verbs",
    parentId: "root",
  },
  {
    id: "shi",
    name: "し - Reasons",
    parentId: "root",
  },
  {
    id: "pf",
    name: "Potential Form",
    parentId: "verbs",
  },
];

describe("tagSectionOptions", () => {
  it("flattens the tree into one option per tag, sectioned by parent", () => {
    const opts = tagSectionOptions(NODES, "root", "Grammar");

    expect(opts.map(o => o.value).sort()).toEqual(["pf", "shi", "verbs"]);

    // Top-level tags sit under the root label; the subtag under its parent's name.
    expect(opts.find(o => o.value === "verbs")?.section).toBe("Grammar");
    expect(opts.find(o => o.value === "shi")?.section).toBe("Grammar");
    expect(opts.find(o => o.value === "pf")).toMatchObject({
      label: "Potential Form",
      section: "Verbs",
    });

    // Root section comes before the nested one (the subtag is emitted after both root children).
    expect(opts.at(-1)?.value).toBe("pf");
  });

  it("returns nothing for an empty tree", () => {
    expect(tagSectionOptions([], "root", "Grammar")).toEqual([]);
  });
});

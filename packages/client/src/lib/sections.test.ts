import type { BookmarkSectionNode, BookmarkSectionRef } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import {
  buildTaggedSectionTree,
  flattenSectionTree,
  orderSectionsByTree,
  resolveSectionPage,
  sectionRangeLabel,
  sectionRefStartMs,
  sectionRefToSegment,
  summarizeSectionRange,
} from "./sections";

function ref(over: Partial<BookmarkSectionRef>): BookmarkSectionRef {
  return {
    id: "s1",
    label: "Part 2",
    type: "timestamp",
    startValue: "1:00",
    endValue: "2:00",
    ...over,
  };
}

function node(over: Partial<BookmarkSectionNode> & { id: string }): BookmarkSectionNode {
  return {
    name: over.id,
    parentId: null,
    type: "name",
    startValue: null,
    endValue: null,
    url: null,
    tagIds: [],
    completed: false,
    ...over,
  };
}

describe("sectionRefToSegment", () => {
  it("converts a timestamp section into a segment", () => {
    const seg = sectionRefToSegment(ref({}));
    expect(seg).toMatchObject({
      label: "Part 2",
      startMs: 60_000,
      endMs: 120_000,
      maxReplays: null,
      gapMs: null,
    });
    expect(seg?.id).toBeTruthy();
  });

  it("returns null for a non-timestamp section", () => {
    expect(sectionRefToSegment(ref({
      type: "page",
      startValue: "12",
      endValue: null,
    }))).toBeNull();
  });

  it("returns null when the start or end can't be parsed", () => {
    expect(sectionRefToSegment(ref({
      startValue: null,
    }))).toBeNull();
    expect(sectionRefToSegment(ref({
      endValue: "",
    }))).toBeNull();
  });
});

describe("sectionRefStartMs", () => {
  it("returns the parsed start ms for a timestamp section", () => {
    expect(sectionRefStartMs(ref({
      startValue: "0:30",
    }))).toBe(30_000);
  });

  it("returns null for null, non-timestamp, or unparseable sections", () => {
    expect(sectionRefStartMs(null)).toBeNull();
    expect(sectionRefStartMs(ref({
      type: "name",
    }))).toBeNull();
    expect(sectionRefStartMs(ref({
      startValue: null,
    }))).toBeNull();
  });
});

describe("resolveSectionPage", () => {
  // Unit 3 (p.12–14) has two sub-items with no page of their own; a standalone timestamp clip has none.
  const NODES: BookmarkSectionNode[] = [
    node({
      id: "unit3",
      type: "page",
      startValue: "12",
      endValue: "14",
    }),
    node({
      id: "hagaki",
      parentId: "unit3",
    }),
    node({
      id: "single",
      parentId: "unit3",
      type: "page",
      startValue: "13",
    }),
    node({
      id: "clip",
      type: "timestamp",
      startValue: "1:00",
      endValue: "2:00",
    }),
  ];

  it("uses a page section's own page (single value or range)", () => {
    expect(resolveSectionPage(NODES, "unit3")).toBe("12–14");
    expect(resolveSectionPage(NODES, "single")).toBe("13");
  });

  it("inherits the nearest paged ancestor's page when the section has none", () => {
    expect(resolveSectionPage(NODES, "hagaki")).toBe("12–14");
  });

  it("returns null when neither the section nor any ancestor is paged", () => {
    expect(resolveSectionPage(NODES, "clip")).toBeNull();
    expect(resolveSectionPage(NODES, null)).toBeNull();
    expect(resolveSectionPage(NODES, "missing")).toBeNull();
  });
});

describe("flattenSectionTree", () => {
  // Ch 1 → (1.1, 1.2); Ch 2 → (2.1) — pre-order should interleave each parent with its children.
  const TREE: BookmarkSectionNode[] = [
    node({
      id: "c1",
    }),
    node({
      id: "c1a",
      parentId: "c1",
    }),
    node({
      id: "c1b",
      parentId: "c1",
    }),
    node({
      id: "c2",
    }),
    node({
      id: "c2a",
      parentId: "c2",
    }),
  ];

  it("walks depth-first pre-order, preserving upstream order", () => {
    expect(flattenSectionTree(TREE).map(n => n.id)).toEqual(["c1", "c1a", "c1b", "c2", "c2a"]);
  });

  it("does not loop on a cyclic parent link", () => {
    const cyclic: BookmarkSectionNode[] = [
      node({
        id: "a",
        parentId: "b",
      }),
      node({
        id: "b",
        parentId: "a",
      }),
    ];
    // A pure cycle has no root, so nothing is reachable — it just terminates.
    expect(flattenSectionTree(cyclic)).toEqual([]);
  });
});

describe("summarizeSectionRange", () => {
  const TREE: BookmarkSectionNode[] = [
    node({
      id: "c1",
      name: "Chapter 1",
    }),
    node({
      id: "c2",
      name: "Chapter 2",
    }),
    node({
      id: "c3",
      name: "Chapter 3",
    }),
  ];
  const chapter = (id: string, label: string) => ref({
    id,
    label,
    type: "name",
  });

  it("returns null for no sections", () => {
    expect(summarizeSectionRange(TREE, [])).toBeNull();
  });

  it("returns the lone label for a single section", () => {
    expect(summarizeSectionRange(TREE, [chapter("c2", "Chapter 2")])).toBe("Chapter 2");
  });

  it("shows first – last in tree order regardless of selection order", () => {
    const picked = [chapter("c3", "Chapter 3"), chapter("c1", "Chapter 1")];
    expect(summarizeSectionRange(TREE, picked)).toBe("Chapter 1 – Chapter 3");
  });

  it("orders sections by their position in the tree, unknown sections last", () => {
    const picked = [chapter("c3", "Chapter 3"), chapter("x", "Extra"), chapter("c1", "Chapter 1")];
    expect(orderSectionsByTree(TREE, picked).map(s => s.id)).toEqual(["c1", "c3", "x"]);
  });
});

describe("sectionRangeLabel", () => {
  const chapter = (label: string) => ref({
    label,
    type: "name",
  });

  it("returns null for no sections", () => {
    expect(sectionRangeLabel([])).toBeNull();
  });

  it("returns the lone label for one section", () => {
    expect(sectionRangeLabel([chapter("Chapter 2")])).toBe("Chapter 2");
  });

  it("joins first and last (preserving given order) for several", () => {
    expect(sectionRangeLabel([chapter("A"), chapter("B"), chapter("C")])).toBe("A – C");
  });

  it("hoists a shared main section out front as '<section>: <first> – <last>'", () => {
    const range = sectionRangeLabel([
      chapter("PART1 基本文型の整理 › Unit1 わたしはタスです。"),
      chapter("PART1 基本文型の整理 › Unit3"),
      chapter("PART1 基本文型の整理 › ◎ Unit1〜Unit5 実戦練習"),
    ]);
    expect(range).toBe("PART1 基本文型の整理: Unit1 わたしはタスです。 – ◎ Unit1〜Unit5 実戦練習");
  });

  it("hoists every shared leading level, keeping what differs on each end", () => {
    expect(sectionRangeLabel([chapter("A › B › C"), chapter("A › B › D")])).toBe("A › B: C – D");
  });

  it("leaves both endpoints intact when no main section is shared", () => {
    expect(sectionRangeLabel([chapter("PART1 › Unit1"), chapter("PART2 › Unit9")]))
      .toBe("PART1 › Unit1 – PART2 › Unit9");
  });

  it("keeps at least the deepest level of each endpoint when one is a shared prefix", () => {
    expect(sectionRangeLabel([chapter("A › B › C"), chapter("A › B")])).toBe("A: B › C – B");
  });
});

describe("buildTaggedSectionTree", () => {
  it("nests matched sub-items under their matched parent, showing own names + pages", () => {
    // 第27課 (parent, tagged) with three tagged sub-items — mirrors the reported case.
    const sections: BookmarkSectionRef[] = [
      ref({
        id: "u27",
        name: "第27課",
        parentId: null,
        label: "第27課",
        type: "name",
        startValue: null,
        endValue: null,
      }),
      ref({
        id: "c1",
        name: "1．可能動詞",
        parentId: "u27",
        label: "第27課 › 1．可能動詞",
        type: "page",
        startValue: "12",
        endValue: null,
      }),
      ref({
        id: "c2",
        name: "2．(場所)で／に[可能動詞]",
        parentId: "u27",
        label: "第27課 › 2．(場所)で／に[可能動詞]",
        type: "name",
        startValue: null,
        endValue: null,
      }),
    ];
    const tree = buildTaggedSectionTree(sections);
    expect(tree).toHaveLength(1);
    expect(tree[0].section.id).toBe("u27");
    expect(tree[0].label).toBe("第27課");
    expect(tree[0].children.map(c => c.label)).toEqual([
      "1．可能動詞 (p. 12)",
      "2．(場所)で／に[可能動詞]",
    ]);
  });

  it("shows the breadcrumb for a matched sub-item whose parent isn't itself matched", () => {
    const sections: BookmarkSectionRef[] = [
      ref({
        id: "c1",
        name: "1．可能動詞",
        parentId: "u27", // parent not in the matched set
        label: "第27課 › 1．可能動詞",
        type: "name",
        startValue: null,
        endValue: null,
      }),
    ];
    const tree = buildTaggedSectionTree(sections);
    expect(tree).toHaveLength(1);
    expect(tree[0].label).toBe("第27課 › 1．可能動詞");
    expect(tree[0].children).toHaveLength(0);
  });
});

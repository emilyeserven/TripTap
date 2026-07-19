import type { BookmarkSectionNode, BookmarkSectionRef } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import { resolveSectionPage, sectionRefStartMs, sectionRefToSegment } from "./sections";

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

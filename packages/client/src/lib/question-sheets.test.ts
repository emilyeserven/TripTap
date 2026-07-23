import type { BookmarkSectionMatch, BookmarkSectionRef, QuestionSheet } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import { buildTocIndex, groupSheetsByResource } from "./question-sheets";

/** A minimal question sheet carrying only the fields the grouping helpers read. */
function sheet(
  id: string,
  bookmarkId: string | null,
  sectionId?: string,
  page: string | null = null,
): QuestionSheet {
  const sections: BookmarkSectionRef[] = sectionId
    ? [{
      id: sectionId,
      label: sectionId,
      type: "name",
      startValue: null,
      endValue: null,
    }]
    : [];
  return {
    id,
    bookmarkId,
    sections,
    page,
  } as unknown as QuestionSheet;
}

/** A section match tying a section id to its owning bookmark (order = TOC order). */
function match(bookmarkId: string, sectionId: string): BookmarkSectionMatch {
  return {
    bookmarkId,
    bookmarkTitle: bookmarkId,
    bookmarkUrl: null,
    imageUrl: null,
    mediaType: null,
    tagIds: [],
    section: {
      id: sectionId,
      label: sectionId,
      type: "name",
      startValue: null,
      endValue: null,
    },
  };
}

describe("buildTocIndex", () => {
  it("assigns each bookmark's sections a first-seen position", () => {
    const index = buildTocIndex([
      match("book-a", "s1"),
      match("book-a", "s2"),
      match("book-b", "s1"),
      match("book-a", "s1"), // duplicate keeps its first position
    ]);
    expect(index.get("book-a")).toEqual(new Map([["s1", 0], ["s2", 1]]));
    expect(index.get("book-b")).toEqual(new Map([["s1", 0]]));
  });
});

describe("groupSheetsByResource", () => {
  it("buckets by bookmark and puts the no-resource group last", () => {
    const groups = groupSheetsByResource(
      [sheet("q1", "book-a"), sheet("q2", null), sheet("q3", "book-b"), sheet("q4", "book-a")],
      new Map(),
    );
    expect(groups.map(g => g.bookmarkId)).toEqual(["book-a", "book-b", null]);
    expect(groups[0].sheets.map(s => s.id)).toEqual(["q1", "q4"]);
    expect(groups[2].sheets.map(s => s.id)).toEqual(["q2"]);
  });

  it("orders sheets within a group by their section's TOC position", () => {
    const toc = buildTocIndex([
      match("book-a", "s1"),
      match("book-a", "s2"),
      match("book-a", "s3"),
    ]);
    const groups = groupSheetsByResource(
      [sheet("q-s3", "book-a", "s3"), sheet("q-s1", "book-a", "s1"), sheet("q-s2", "book-a", "s2")],
      toc,
    );
    expect(groups[0].sheets.map(s => s.id)).toEqual(["q-s1", "q-s2", "q-s3"]);
  });

  it("orders a section-less group by page number", () => {
    const groups = groupSheetsByResource(
      [
        sheet("q-p12", "book-a", undefined, "p. 12–13"),
        sheet("q-p3", "book-a", undefined, "ch. 3"),
        sheet("q-none", "book-a", undefined, null),
        sheet("q-p8", "book-a", undefined, "8"),
      ],
      new Map(),
    );
    // 3, 8, 12, then the page-less sheet (Infinity) last.
    expect(groups[0].sheets.map(s => s.id)).toEqual(["q-p3", "q-p8", "q-p12", "q-none"]);
  });

  it("sorts sheets with no/unknown section after ranked ones, keeping incoming order", () => {
    const toc = buildTocIndex([match("book-a", "s1"), match("book-a", "s2")]);
    const groups = groupSheetsByResource(
      [
        sheet("q-none", "book-a"), // no section
        sheet("q-s2", "book-a", "s2"),
        sheet("q-unknown", "book-a", "s9"), // section not in TOC
        sheet("q-s1", "book-a", "s1"),
      ],
      toc,
    );
    expect(groups[0].sheets.map(s => s.id)).toEqual(["q-s1", "q-s2", "q-none", "q-unknown"]);
  });
});

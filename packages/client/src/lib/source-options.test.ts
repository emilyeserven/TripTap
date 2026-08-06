import type { Source } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import {
  ALL_SOURCES,
  matchesSourceFilter,
  sourceFilterOptions,
  sourceMenuIndent,
} from "./source-options";

function source(id: string, name: string, parentId: string | null = null): Source {
  return {
    id,
    name,
    type: null,
    author: null,
    url: null,
    notes: null,
    parentId,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

const SOURCES: Source[] = [
  source("mag", "NHK News Web Easy"),
  source("issue", "2024-06", "mag"),
  source("page", "p. 12", "issue"),
  source("book", "よつばと！ vol. 1"),
];

describe("sourceFilterOptions", () => {
  it("leads with the reset option and labels each source with its full path", () => {
    expect(sourceFilterOptions(SOURCES)).toEqual([
      {
        value: ALL_SOURCES,
        label: "All sources",
      },
      {
        value: "mag",
        label: "NHK News Web Easy",
      },
      {
        value: "issue",
        label: "NHK News Web Easy › 2024-06",
      },
      {
        value: "page",
        label: "NHK News Web Easy › 2024-06 › p. 12",
      },
      {
        value: "book",
        label: "よつばと！ vol. 1",
      },
    ]);
  });

  it("still offers the reset option before the sources have loaded", () => {
    expect(sourceFilterOptions(undefined)).toEqual([{
      value: ALL_SOURCES,
      label: "All sources",
    }]);
  });
});

describe("matchesSourceFilter", () => {
  it("matches everything when no source is chosen", () => {
    const match = matchesSourceFilter(SOURCES, ALL_SOURCES);
    expect(match("page")).toBe(true);
    expect(match(null)).toBe(true);
  });

  it("matches a chosen source and everything nested under it", () => {
    const match = matchesSourceFilter(SOURCES, "mag");
    expect(match("mag")).toBe(true);
    expect(match("issue")).toBe(true);
    expect(match("page")).toBe(true);
    expect(match("book")).toBe(false);
    expect(match(null)).toBe(false);
  });

  it("matches only the leaf when a leaf is chosen", () => {
    const match = matchesSourceFilter(SOURCES, "page");
    expect(match("page")).toBe(true);
    expect(match("issue")).toBe(false);
  });
});

describe("sourceMenuIndent", () => {
  it("indents by depth, and not at all at the root", () => {
    expect(sourceMenuIndent(0)).toBe("");
    expect(sourceMenuIndent(1)).toBe(`${"\u00A0".repeat(3)}\u21B3 `);
    expect(sourceMenuIndent(2).startsWith("\u00A0".repeat(6))).toBe(true);
  });
});

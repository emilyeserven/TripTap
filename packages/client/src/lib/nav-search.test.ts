import { describe, expect, it } from "vitest";

import { allNavSections, sectionTiles } from "@/lib/nav";
import { filterNavSections } from "@/lib/nav-search";

function tileTitles(query: string): string[] {
  return filterNavSections(allNavSections, query).flatMap(s => s.tiles.map(t => t.title));
}

describe("filterNavSections", () => {
  it("returns every section and tile for an empty query", () => {
    const shown = filterNavSections(allNavSections, "");
    expect(shown).toHaveLength(allNavSections.length);
    expect(shown.flatMap(s => s.tiles))
      .toHaveLength(allNavSections.flatMap(sectionTiles).length);
  });

  it("ignores surrounding whitespace", () => {
    expect(filterNavSections(allNavSections, "   ")).toHaveLength(allNavSections.length);
    expect(tileTitles("  kanji  ")).toEqual(tileTitles("kanji"));
  });

  it("matches tile titles case-insensitively", () => {
    expect(tileTitles("KANJI")).toContain("Kanji");
  });

  it("matches tile descriptions", () => {
    // "Captures" is described as "Everything you've captured, ready to process."
    expect(tileTitles("ready to process")).toEqual(["Captures"]);
  });

  it("matches the route, so a URL-ish query still lands", () => {
    expect(tileTitles("shadowing-lists")).toEqual(["Shadowing Lists"]);
  });

  it("finds tiles nested under a parent entry", () => {
    expect(tileTitles("Mistake Reasons")).toEqual(["Mistake Reasons"]);
  });

  it("keeps every tile of a section whose heading matches", () => {
    const shown = filterNavSections(allNavSections, "Knowledge");
    expect(shown).toHaveLength(1);
    expect(shown[0]?.section.label).toBe("Knowledge");
    expect(shown[0]?.tiles.map(t => t.title)).toEqual(
      sectionTiles(allNavSections.find(s => s.label === "Knowledge")!).map(t => t.title),
    );
  });

  it("drops sections left with no matching tiles", () => {
    const shown = filterNavSections(allNavSections, "Kanji");
    expect(shown.every(s => s.tiles.length > 0)).toBe(true);
    expect(shown.map(s => s.section.label)).not.toContain("Practice");
  });

  it("returns nothing when the query matches nothing", () => {
    expect(filterNavSections(allNavSections, "zzzzznotathing")).toEqual([]);
  });
});

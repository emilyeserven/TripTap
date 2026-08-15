import type { NavDestination, NavEntry, NavParent, NavSection } from "./nav";

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { allNavSections, navFooterItems, navSections, sectionTiles } from "./nav";
import { filterNavSections } from "./nav-search";

const SRC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function isParent(item: NavEntry): item is NavParent {
  return "children" in item;
}

/** Every entry the sidebar renders as a row or a sub-row, plus the pinned footer items. */
const allEntries: NavEntry[] = [...navSections.flatMap(s => s.items), ...navFooterItems];
const allParents = allEntries.filter(isParent);
/** Every place you can actually navigate to, parents with a page included. */
const allDestinations: { title: string;
  to: string;
  description?: string; }[] = allEntries.flatMap(item => (
  isParent(item)
    ? [...(item.to
      ? [{
        title: item.title,
        to: item.to,
        description: item.description,
      }]
      : []), ...item.children]
    : [item]
));

describe("nav data", () => {
  it("never points two entries at the same page", () => {
    // /sentences used to have three entries (bank, ?view=mine, ?view=practice) which all lit up at
    // once, because the sidebar's active check ignores search params. Views belong on the page.
    const byTo = new Map<string, string[]>();
    for (const d of allDestinations) byTo.set(d.to, [...byTo.get(d.to) ?? [], d.title]);
    const duplicated = [...byTo].filter(([, titles]) => titles.length > 1);
    expect(duplicated).toEqual([]);
  });

  it("gives every destination a homepage blurb", () => {
    const missing = allDestinations.filter(d => !d.description?.trim()).map(d => d.to);
    expect(missing).toEqual([]);
  });

  it("keeps `to` and `description` together on parents", () => {
    // A grouping-only parent has neither, so it contributes no tile; a page-backed one has both.
    for (const parent of allParents) {
      expect(Boolean(parent.to), `${parent.title} to/description mismatch`)
        .toBe(Boolean(parent.description));
    }
  });

  it("gives every parent children", () => {
    for (const parent of allParents) expect(parent.children.length).toBeGreaterThan(0);
  });

  it("tiles every destination exactly once on the homepage", () => {
    const tiled = allNavSections.flatMap(sectionTiles).map(t => t.to);
    expect([...tiled].sort()).toEqual([...allDestinations.map(d => d.to)].sort());
  });

  it("puts the pinned footer items on the homepage too", () => {
    // The sidebar pins Profile/Settings to its bottom edge; the homepage folds them into Setup so
    // it stays the exhaustive index.
    const tiled = allNavSections.flatMap(sectionTiles).map(t => t.to);
    for (const item of navFooterItems) expect(tiled).toContain(item.to);
  });
});

describe("nav routes", () => {
  /** Every URL the generated route tree serves, normalized to how `nav.ts` writes them. */
  const routePaths = (() => {
    const gen = readFileSync(resolve(SRC_DIR, "routeTree.gen.ts"), "utf8");
    const block = /export interface FileRoutesByFullPath \{([\s\S]*?)\n\}/.exec(gen)?.[1] ?? "";
    return new Set(
      [...block.matchAll(/^\s*'([^']+)':/gm)]
        .map(m => m[1])
        // Index routes are generated with a trailing slash (`/sentences/`); nav writes `/sentences`.
        .map(p => (p.length > 1 ? p.replace(/\/$/, "") : p)),
    );
  })();

  it("reads the generated route tree", () => {
    expect(routePaths.size).toBeGreaterThan(50);
  });

  it("only links to routes that exist", () => {
    const dangling = allDestinations.filter(d => !routePaths.has(d.to)).map(d => `${d.title} → ${d.to}`);
    expect(dangling).toEqual([]);
  });
});

describe("hub pages own their children", () => {
  /**
   * The sidebar renders a parent that has its own page as a single plain link, so that page is the
   * only way in to its children. This asserts the other half of that bargain: each page-backed
   * parent's route file links to every child it claims. Without it, adding a child to a hub would
   * silently strand it in the sidebar.
   */
  const pageBackedParents = allParents.filter((p): p is NavParent & { to: string } => Boolean(p.to));

  it("covers the parents that have a page", () => {
    expect(pageBackedParents.length).toBeGreaterThan(0);
  });

  it.each(pageBackedParents.map(p => [p.title, p] as const))("%s links to each child", (_title, parent) => {
    // `/reading-writing` → routes/reading-writing.index.tsx, `/exercises` → routes/exercises.tsx.
    const base = resolve(SRC_DIR, "routes", parent.to.replace(/^\//, "").replaceAll("/", "."));
    const source = [`${base}.index.tsx`, `${base}.tsx`]
      .reduce<string | null>((found, path) => {
        if (found !== null) return found;
        try {
          return readFileSync(path, "utf8");
        }
        catch {
          return null;
        }
      }, null);
    expect(source, `no route file for ${parent.to}`).not.toBeNull();

    const unlinked = parent.children
      .filter(child => !source!.includes(`to="${child.to}"`))
      .map(child => child.to);
    expect(unlinked).toEqual([]);
  });
});

describe("nav sections", () => {
  const sections: readonly NavSection[] = navSections;

  it("labels and describes every section", () => {
    for (const section of sections) {
      expect(section.label.trim()).not.toBe("");
      expect(section.description.trim()).not.toBe("");
      expect(section.items.length).toBeGreaterThan(0);
    }
  });

  it("leads with Today so the backlogs sit under Start Something", () => {
    expect(sections[0]?.label).toBe("Today");
  });

  it("keeps section labels unique", () => {
    const labels = sections.map(s => s.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("never repeats a hub's child as its own sidebar row", () => {
    // The sidebar shows one row per section item. A child that also appears as a top-level item
    // would be listed twice over — the shape this reorg exists to undo.
    const rows = sections.flatMap(s => s.items);
    const rowPaths = new Set(rows.map(item => item.to).filter(Boolean));
    const repeated = rows
      .filter(isParent)
      .flatMap(parent => parent.children.filter(child => rowPaths.has(child.to)))
      .map(child => child.to);
    expect(repeated).toEqual([]);
  });

  // Driven off the section list rather than literal labels, so renaming a section can't quietly
  // leave a search test asserting on a heading that no longer exists (which is how the "Library"
  // case in nav-search.test.ts went stale).
  it.each(allNavSections.map(s => [s.label] as const))(
    "searching the %s heading returns that section whole",
    (label) => {
      const shown = filterNavSections(allNavSections, label);
      const match = shown.find(s => s.section.label === label);
      expect(match, `searching "${label}" did not return its own section`).toBeDefined();
      expect(match?.tiles.map(t => t.to))
        .toEqual(sectionTiles(allNavSections.find(s => s.label === label)!).map(t => t.to));
    },
  );

  it("shows fewer sidebar rows than the homepage shows tiles", () => {
    // The point of folding children into their hub: the sidebar is a map, the homepage is the index.
    const rows = sections.flatMap(s => s.items).length;
    const tiles: NavDestination[] = allNavSections.flatMap(sectionTiles);
    expect(rows).toBeLessThan(tiles.length);
  });
});

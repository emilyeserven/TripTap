import type { NavDestination, NavSection } from "@/lib/nav";

import { matches } from "@/components/ai-lesson/search";
import { sectionTiles } from "@/lib/nav";

/** A homepage section paired with the tiles that survived the search. */
export interface FilteredNavSection {
  section: NavSection;
  tiles: NavDestination[];
}

/**
 * The homepage sections narrowed to the tiles matching `query`.
 *
 * A section whose own label or description matches keeps every one of its tiles, so searching a
 * heading ("Library", "Collections") shows the whole group rather than nothing. Otherwise tiles are
 * matched on title, description, and route — the route lets a search like "shadowing-lists" or
 * "renshuu" land even when the wording differs. Sections left with no tiles are dropped; an empty
 * query returns everything unchanged.
 */
export function filterNavSections(
  sections: readonly NavSection[],
  query: string,
): FilteredNavSection[] {
  return sections
    .map((section) => {
      const tiles = sectionTiles(section);
      const wholeSection = matches(query, section.label, section.description);
      return {
        section,
        tiles: wholeSection ? tiles : tiles.filter(t => matches(query, t.title, t.description, t.to)),
      };
    })
    .filter(s => s.tiles.length > 0);
}

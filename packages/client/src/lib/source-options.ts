import type { ComboboxOption } from "@/components/ui/combobox";
import type { Source } from "@sentence-bank/types";

import { flattenSourceTree, sourcePathLabel, sourceSubtreeIds } from "@sentence-bank/types";

/**
 * Indent prefix for a nested source in a `<Select>` menu, so the tier a choice sits on is visible at
 * a glance. Non-breaking spaces, since ordinary leading spaces collapse in HTML.
 */
export function sourceMenuIndent(depth: number): string {
  return depth === 0 ? "" : `${"\u00A0".repeat(depth * 3)}\u21B3 `;
}

/** The reset value of a source filter — kept as the first option so `SentenceFilters` can find it. */
export const ALL_SOURCES = "all";

/**
 * Options for a "filter by source" control, one per source, ordered parent-then-children.
 *
 * The label is the full path ("NHK News Web Easy › 2024-06 › p. 12") rather than the bare name:
 * these render in flat, searchable menus where "p. 12" alone says nothing, and typing the magazine's
 * name should turn up its pages.
 */
export function sourceFilterOptions(sources: Source[] | undefined): ComboboxOption[] {
  const all = sources ?? [];
  return [
    {
      value: ALL_SOURCES,
      label: "All sources",
    },
    ...flattenSourceTree(all).map(({
      source,
    }) => ({
      value: source.id,
      label: sourcePathLabel(all, source.id),
    })),
  ];
}

/**
 * Predicate for the selected source filter, matching the chosen source *and everything under it* —
 * picking a magazine shows the captures of all its pages, which is the only reading of "from this
 * magazine" that stays true once sources nest.
 */
export function matchesSourceFilter(
  sources: Source[] | undefined,
  filter: string,
): (sourceId: string | null) => boolean {
  if (filter === ALL_SOURCES) return () => true;
  const subtree = sourceSubtreeIds(sources ?? [], filter);
  return sourceId => sourceId !== null && subtree.has(sourceId);
}

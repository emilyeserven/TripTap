/**
 * The pure core of the kanji index: corpus text in, per-character aggregates out.
 *
 * Deliberately free of Drizzle and of `db` so it can be unit-tested directly with fixed input — the
 * counting rules (repeats within one item, distinct-item tallies, first/last seen) are the part worth
 * testing, and they need no database to exercise.
 */

import type { FuriToken, KanjiOccurrence, KanjiSourceKind } from "@sentence-bank/types";
import { KANJI_SOURCE_KINDS, extractKanji } from "@sentence-bank/types";

/** One row of the learner's corpus, normalized across the six source tables. */
export interface KanjiSourceItem {
  kind: KanjiSourceKind;
  id: string;
  text: string;
  reading: FuriToken[] | null;
  gloss: string | null;
  createdAt: string;
}

/** Everything derived about one character, before the learner's status is merged in. */
export interface KanjiAggregate {
  char: string;
  occurrences: number;
  itemCount: number;
  kindCounts: Record<KanjiSourceKind, number>;
  firstSeenAt: string;
  lastSeenAt: string;
  items: KanjiOccurrence[];
}

/** A zeroed per-kind tally. Every kind is present so the client never has to guard on a missing key. */
function emptyKindCounts(): Record<KanjiSourceKind, number> {
  return Object.fromEntries(KANJI_SOURCE_KINDS.map(k => [k, 0])) as Record<KanjiSourceKind, number>;
}

/**
 * Count how many times each distinct kanji occurs in one string.
 *
 * Returns a map rather than a list because the aggregate needs both numbers: the *total* occurrences
 * (時々 contributes 1 to 時, but 人人 contributes 2 to 人) and the fact that the item counts only once
 * toward `itemCount` however often the character repeats inside it.
 */
function countByChar(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ch of extractKanji(text)) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  return counts;
}

/**
 * Build the per-character index over the whole corpus.
 *
 * `firstSeenAt`/`lastSeenAt` are the oldest and newest `createdAt` among the items containing the
 * character — compared as ISO strings, which sort correctly because they're all UTC and
 * fixed-width. Each character's `items` come back newest first, which is the order the detail page
 * shows them in.
 */
export function indexKanji(items: KanjiSourceItem[]): Map<string, KanjiAggregate> {
  const index = new Map<string, KanjiAggregate>();

  for (const item of items) {
    for (const [char, count] of countByChar(item.text)) {
      let agg = index.get(char);
      if (!agg) {
        agg = {
          char,
          occurrences: 0,
          itemCount: 0,
          kindCounts: emptyKindCounts(),
          firstSeenAt: item.createdAt,
          lastSeenAt: item.createdAt,
          items: [],
        };
        index.set(char, agg);
      }

      agg.occurrences += count;
      agg.itemCount += 1;
      agg.kindCounts[item.kind] += 1;
      if (item.createdAt < agg.firstSeenAt) agg.firstSeenAt = item.createdAt;
      if (item.createdAt > agg.lastSeenAt) agg.lastSeenAt = item.createdAt;
      agg.items.push({
        kind: item.kind,
        id: item.id,
        text: item.text,
        reading: item.reading,
        gloss: item.gloss,
        count,
        createdAt: item.createdAt,
      });
    }
  }

  for (const agg of index.values()) {
    agg.items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return index;
}

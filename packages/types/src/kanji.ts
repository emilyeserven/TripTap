/**
 * Shared "Kanji" domain types.
 *
 * The kanji index is *derived* server-side from the learner's own corpus — the same principle as XP
 * (see `xp.ts`): nothing is written when a character is "encountered". Scanning the text-bearing
 * tables yields, per character, how often it appears and in which items. The only persisted state is
 * the learner's self-assigned {@link KanjiStatus}, so counts stay honest as the corpus grows.
 *
 * Consumed by both the Fastify API and the React client.
 */

// Type-only import (erased at build) — `FuriToken` lives in the barrel; no runtime cycle.
import type { FuriToken } from "./index.js";

import { z } from "zod";

import { objectJsonSchema } from "./json-schema.js";

/** Where an occurrence was found. One entry per text-bearing table the index scans. */
export const KANJI_SOURCE_KINDS = [
  "sentence",
  "my-sentence",
  "practice",
  "vocab",
  "dialogue",
  "writing",
] as const;

/** One source table from {@link KANJI_SOURCE_KINDS}. */
export type KanjiSourceKind = (typeof KANJI_SOURCE_KINDS)[number];

/** The learner's self-assigned progress on a character. Defaults to `new` when never set. */
export const KANJI_STATUSES = ["new", "learning", "known"] as const;

/** One status from {@link KANJI_STATUSES}. */
export type KanjiStatus = (typeof KANJI_STATUSES)[number];

/** One row of the kanji grid: a character plus how much of the corpus it appears in. */
export interface KanjiSummary {
  /** The character itself — a single Han code point, and the resource's identifier. */
  char: string;
  /** Total appearances across the whole corpus (a character counted twice in one sentence counts twice). */
  occurrences: number;
  /** How many distinct items it appears in — a better "how familiar is this" signal than raw count. */
  itemCount: number;
  /** Per-source-kind item counts, for the grid's filter chips. */
  kindCounts: Record<KanjiSourceKind, number>;
  /** ISO-8601 timestamp of the oldest item containing it. */
  firstSeenAt: string;
  /** ISO-8601 timestamp of the newest item containing it. */
  lastSeenAt: string;
  /** The learner's status; `new` when they've never marked it. */
  status: KanjiStatus;
}

/** One item in the learner's corpus that contains a given character. */
export interface KanjiOccurrence {
  kind: KanjiSourceKind;
  id: string;
  /** The item's text (a sentence, a vocab term, a dialogue script). */
  text: string;
  /** Generated furigana for {@link text}, when the source table stores it; null otherwise. */
  reading: FuriToken[] | null;
  /** A one-line gloss for display — translation, meaning, or title; null when the item has none. */
  gloss: string | null;
  /** How many times the character occurs within this one item. */
  count: number;
  /** ISO-8601 timestamp the item was created. */
  createdAt: string;
}

/** The detail payload for one character: its summary, the learner's note, and every occurrence. */
export interface KanjiDetail extends KanjiSummary {
  /** The learner's free-text note on this character; null when none. */
  note: string | null;
  /**
   * Every item containing the character, newest first. Named `items` rather than `occurrences`
   * because {@link KanjiSummary.occurrences} is already the total *count*.
   */
  items: KanjiOccurrence[];
}

/** How the grid is ordered. */
export const KANJI_SORTS = ["occurrences", "recent", "char"] as const;

/** One ordering from {@link KANJI_SORTS}. */
export type KanjiSort = (typeof KANJI_SORTS)[number];

/** Query parameters accepted by `GET /api/kanji`. */
export interface KanjiListQuery {
  status?: KanjiStatus;
  kind?: KanjiSourceKind;
  minOccurrences?: number;
  sort?: KanjiSort;
}

/**
 * Payload for `PUT /api/kanji/:char/status`.
 *
 * `note` is tri-state in effect: omitted leaves it, `null` clears it, a string replaces it.
 */
export const updateKanjiStatusSchema = z.object({
  status: z.enum(KANJI_STATUSES),
  note: z.string().nullable().optional(),
});

/** JSON Schema (draft-07) for the status payload, used verbatim as the route body. */
export const updateKanjiStatusJsonSchema = objectJsonSchema(updateKanjiStatusSchema);

/** The status-update payload. */
export type UpdateKanjiStatusInput = z.infer<typeof updateKanjiStatusSchema>;

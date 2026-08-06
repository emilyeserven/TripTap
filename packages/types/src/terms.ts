/**
 * Shared helpers for the borrowed-taxonomy term refs ({@link SentenceTermRef}) that tag entities
 * across the app. Term refs are the only cross-feature join key TripTap has, so the logic for
 * reading them lives here — shared by the Fastify API and the React client — rather than being
 * re-derived per package.
 *
 * Two storage shapes are in circulation and both are legitimate:
 *
 * - an **all-channels list** (`terms`), where each ref carries its own {@link SentenceTermCategory}
 *   and readers split by channel — used where an entity can be tagged from any channel;
 * - a **pre-split grammar list** (`grammarTerms`), which is grammar-only by construction — used
 *   where only grammar tagging makes sense.
 *
 * {@link grammarTermsOf} reads either, so a caller joining "everything tagged with this grammar
 * point" never has to care which shape an entity happens to use.
 */

import type { SentenceTermCategory, SentenceTermRef } from "./index.js";

import { z } from "zod";

/**
 * One term ref, as a route body accepts it.
 *
 * `category` is optional here because it is optional on the wire — see {@link SentenceTermRef}.
 * Every entity that can be tagged validates its `terms` column against this, so the shape is
 * declared once and the generated JSON Schema follows from it.
 */
export const termRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["tag", "taxonomy"]),
  sourceId: z.string(),
  sourceLabel: z.string(),
  category: z.enum(["vocabulary", "grammar", "general", "resource"]).optional(),
});

/** A nullable list of term refs — the `terms` / `grammarTerms` column shape. */
export const termsListSchema = z.array(termRefSchema).nullable();

/** The channels in display order, with their picker/badge labels. */
export const TERM_CATEGORIES: { category: SentenceTermCategory;
  label: string; }[] = [
  {
    category: "vocabulary",
    label: "Vocabulary",
  },
  {
    category: "grammar",
    label: "Grammar",
  },
  {
    category: "general",
    label: "General",
  },
  {
    category: "resource",
    label: "Resources",
  },
];

/**
 * A term's channel. Rows created before channels existed default to "vocabulary"; a term tagged with a
 * retired channel (e.g. the old "listening") is folded into "resource" so it still renders.
 */
export function termCategory(term: SentenceTermRef): SentenceTermCategory {
  // The cast is deliberate, not leftover: `category` is optional *and* a stored row may carry a
  // value outside the union (the retired "listening" channel), which the type can't express.
  const raw = term.category as string | undefined;
  if (raw === "vocabulary" || raw === "grammar" || raw === "general" || raw === "resource") return raw;
  return raw ? "resource" : "vocabulary";
}

/** True when two term lists differ (order-insensitive, by id). */
export function termsChanged(a: SentenceTermRef[], b: SentenceTermRef[]): boolean {
  if (a.length !== b.length) return true;
  const ids = new Set(b.map(t => t.id));
  return a.some(t => !ids.has(t.id));
}

/**
 * Swap out one channel's terms while preserving every other channel's. Editing tags one channel at
 * a time (e.g. grammar only, from a list) writes back the whole `terms` column, so the untouched
 * channels have to be carried through or they'd be silently dropped. Returns null when nothing is
 * left, matching how the API stores "no tags".
 */
export function replaceCategory(
  terms: SentenceTermRef[] | null,
  category: SentenceTermCategory,
  next: SentenceTermRef[] | null,
): SentenceTermRef[] | null {
  const kept = (terms ?? []).filter(t => termCategory(t) !== category);
  const merged = [...kept, ...(next ?? [])];
  return merged.length > 0 ? merged : null;
}

/** Split a term list into per-channel buckets (each bucket may be empty). */
export function groupTermsByCategory(
  terms: SentenceTermRef[],
): Record<SentenceTermCategory, SentenceTermRef[]> {
  const groups: Record<SentenceTermCategory, SentenceTermRef[]> = {
    vocabulary: [],
    grammar: [],
    general: [],
    resource: [],
  };
  for (const term of terms) groups[termCategory(term)].push(term);
  return groups;
}

/**
 * An entity carrying term refs in either supported shape. Both fields are optional so this accepts
 * any tagged entity without each caller having to narrow first.
 */
export interface TaggedEntity {
  /** All-channels term list; channel is read from each ref's `category`. */
  terms?: SentenceTermRef[] | null;
  /** Pre-split grammar-only term list. */
  grammarTerms?: SentenceTermRef[] | null;
}

/**
 * The grammar-channel terms on any tagged entity, whichever shape it stores them in. This is the
 * single reader for "what grammar is this tagged with?" — previously re-implemented once per
 * storage shape on the client and again in the middleware.
 */
export function grammarTermsOf(entity: TaggedEntity): SentenceTermRef[] {
  if (entity.grammarTerms?.length) return entity.grammarTerms;
  return groupTermsByCategory(entity.terms ?? []).grammar;
}

/** Dedupe a flat list of term refs by id, sorted by name — for filter options and badges. */
export function dedupeTerms(terms: SentenceTermRef[]): SentenceTermRef[] {
  const byId = new Map<string, SentenceTermRef>();
  for (const t of terms) if (!byId.has(t.id)) byId.set(t.id, t);
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

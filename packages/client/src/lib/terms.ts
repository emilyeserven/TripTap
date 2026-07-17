import type { SentenceTermCategory, SentenceTermRef } from "@sentence-bank/types";

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

/** Split a sentence's terms into per-channel buckets (each bucket may be empty). */
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

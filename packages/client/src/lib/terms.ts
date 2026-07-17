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
  {
    category: "listening",
    label: "Listening",
  },
];

/** A term's channel, defaulting rows created before channels existed to "vocabulary". */
export function termCategory(term: SentenceTermRef): SentenceTermCategory {
  return (term.category as SentenceTermCategory | undefined) ?? "vocabulary";
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
    listening: [],
  };
  for (const term of terms) groups[termCategory(term)].push(term);
  return groups;
}

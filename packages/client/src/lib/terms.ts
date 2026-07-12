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
    label: "Textbooks & Worksheets",
  },
];

/** A term's channel, defaulting rows created before channels existed to "vocabulary". */
export function termCategory(term: SentenceTermRef): SentenceTermCategory {
  return (term.category as SentenceTermCategory | undefined) ?? "vocabulary";
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

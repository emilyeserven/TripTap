import type { Vocab, VocabItem, WithAiLesson } from "@sentence-bank/types";

import { matches } from "@/components/ai-lesson/search";

/** The Vocabulary page's filter state: the scope select plus the AI-lesson refinements. */
export interface VocabFilters {
  search: string;
  /** "all" | "yours" | "lessons" */
  scope: string;
  aiLesson: string;
  level: string;
  category: string;
  /** "all" | "in" | "not" */
  renshuu: string;
}

/** True when no AI-Lesson-specific refinement is active (lesson/level/category/renshuu all "all"). */
export function noAiLessonNarrowing(f: VocabFilters): boolean {
  return f.aiLesson === "all" && f.level === "all" && f.category === "all" && f.renshuu === "all";
}

/**
 * The standalone-bank vocab to show. The bank carries no lesson/level/category, so any
 * AI-Lesson-specific refinement hides it entirely (unless the scope is explicitly "yours").
 */
export function filterBankVocab(bank: Vocab[], f: VocabFilters): Vocab[] {
  const shown = f.scope !== "lessons" && (f.scope === "yours" || noAiLessonNarrowing(f));
  if (!shown) return [];
  return bank.filter(v => matches(f.search, v.term, v.reading, v.meaning, v.tags, v.notes));
}

/** The AI-lesson vocab to show, applying every refinement plus the text search. */
export function filterAiLessonVocab(
  items: WithAiLesson<VocabItem>[],
  f: VocabFilters,
): WithAiLesson<VocabItem>[] {
  if (f.scope === "yours") return [];
  return items.filter(v =>
    (f.aiLesson === "all" || v.aiLessonSlug === f.aiLesson)
    && (f.level === "all" || v.lvl === f.level)
    && (f.category === "all" || v.cat === f.category)
    && (f.renshuu === "all" || (f.renshuu === "in" ? v.renshuuAdded : !v.renshuuAdded))
    && matches(f.search, v.jp, v.yomi, v.en));
}

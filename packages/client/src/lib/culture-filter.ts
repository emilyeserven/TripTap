import type { CultureItem, CultureNote, WithAiLesson } from "@sentence-bank/types";

import { matches } from "@/components/ai-lesson/search";

/** The Culture page's filter state: the scope select plus the topic and AI-lesson refinements. */
export interface CultureFilters {
  search: string;
  /** "all" | "yours" | "lessons" */
  scope: string;
  aiLesson: string;
  /** "all" | a culture-topic id */
  topic: string;
}

/**
 * The user-authored notes to show. Notes carry no lesson, so narrowing to one AI Lesson hides
 * them entirely (unless the scope is explicitly "yours" — the vocab-filter convention).
 */
export function filterCultureNotes(notes: CultureNote[], f: CultureFilters): CultureNote[] {
  const shown = f.scope !== "lessons" && (f.scope === "yours" || f.aiLesson === "all");
  if (!shown) return [];
  return notes.filter(n =>
    (f.topic === "all" || n.topicIds.includes(f.topic))
    && matches(f.search, n.titleJp, n.titleEn, n.bodyJa, n.bodyEn));
}

/** The AI-lesson culture cards to show, applying every refinement plus the text search. */
export function filterAiLessonCulture(
  items: WithAiLesson<CultureItem>[],
  f: CultureFilters,
): WithAiLesson<CultureItem>[] {
  if (f.scope === "yours") return [];
  return items.filter(c =>
    (f.aiLesson === "all" || c.aiLessonSlug === f.aiLesson)
    && (f.topic === "all" || (c.topicIds ?? []).includes(f.topic))
    && matches(f.search, c.jp, c.en, c.body));
}

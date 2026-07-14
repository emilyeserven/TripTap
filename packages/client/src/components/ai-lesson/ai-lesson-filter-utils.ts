import type { AiLessonRef } from "./AiLessonBadge";

/** Distinct AI Lessons (by slug, first-seen order) appearing in a list of attributed items. */
export function uniqueAiLessons(items: { aiLessonSlug: string;
  aiLessonTitle: string; }[]): AiLessonRef[] {
  const seen = new Map<string, AiLessonRef>();
  for (const it of items) {
    if (!seen.has(it.aiLessonSlug)) seen.set(it.aiLessonSlug, {
      slug: it.aiLessonSlug,
      title: it.aiLessonTitle,
    });
  }
  return [...seen.values()];
}

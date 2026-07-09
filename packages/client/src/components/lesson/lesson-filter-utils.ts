import type { LessonRef } from "./LessonBadge";

/** Distinct lessons (by slug, first-seen order) appearing in a list of attributed items. */
export function uniqueLessons(items: { lessonSlug: string;
  lessonTitle: string; }[]): LessonRef[] {
  const seen = new Map<string, LessonRef>();
  for (const it of items) {
    if (!seen.has(it.lessonSlug)) seen.set(it.lessonSlug, {
      slug: it.lessonSlug,
      title: it.lessonTitle,
    });
  }
  return [...seen.values()];
}

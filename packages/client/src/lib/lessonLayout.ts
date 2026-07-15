import type { LessonWordColumns } from "@/stores/displayStore";

/**
 * Word-note grid classes per column count — shared by the lesson view (read-only word notes) and the
 * lesson editor (`LessonWordNotes`). Always one column when narrow, widening at breakpoints so the
 * cards stack instead of overflowing.
 */
export const WORD_COLUMN_CLASS: Record<LessonWordColumns, string> = {
  1: "grid gap-2",
  2: `
    grid gap-2
    sm:grid-cols-2
  `,
  3: `
    grid gap-2
    sm:grid-cols-2
    lg:grid-cols-3
  `,
};

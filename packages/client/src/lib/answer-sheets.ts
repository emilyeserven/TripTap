import type { AnswerSheet, QuestionSheet } from "@sentence-bank/types";

/** One answerable cell of a question sheet: a stable `id` and a human label for the input. */
export interface QuestionSheetSlot {
  id: string;
  label: string;
}

/**
 * Flatten a question sheet into its answerable slots, in display order. This is the single source of
 * truth shared by the answer form (which renders one input per slot) and the read-only views.
 *
 * - `list` layout: a question with no parts is one slot (`id = q.id`); each part is its own slot
 *   (`id = part.id`), labelled with the question prompt plus the part label.
 * - `grid` layout: each row × column is a slot (`id = ` + "`${row.id}:${colIndex}`"), labelled with
 *   the row label and column heading.
 */
export function questionSheetSlots(qs: QuestionSheet): QuestionSheetSlot[] {
  if (qs.layout === "grid") {
    const grid = qs.grid;
    if (!grid) return [];
    const slots: QuestionSheetSlot[] = [];
    for (const row of grid.rows) {
      grid.columns.forEach((column, colIndex) => {
        slots.push({
          id: `${row.id}:${colIndex}`,
          label: `${row.label} · ${column}`,
        });
      });
    }
    return slots;
  }

  const slots: QuestionSheetSlot[] = [];
  qs.questions.forEach((question, index) => {
    // Blank prompts (e.g. from the "quick fill" count shortcut) fall back to a positional label.
    const base = question.prompt.trim() || `Question ${index + 1}`;
    if (question.parts && question.parts.length > 0) {
      for (const part of question.parts) {
        slots.push({
          id: part.id,
          label: `${base} — ${part.label}`,
        });
      }
    }
    else {
      slots.push({
        id: question.id,
        label: base,
      });
    }
  });
  return slots;
}

/**
 * True when every answerable slot of `qs` has a non-empty answer recorded in `as`. A sheet with no
 * slots is never "complete" (there is nothing to fill in).
 */
export function isAnswerSheetComplete(qs: QuestionSheet, as: AnswerSheet): boolean {
  const slots = questionSheetSlots(qs);
  if (slots.length === 0) return false;
  const byId = new Map(as.entries.map(e => [e.slotId, e] as const));
  return slots.every(s => (byId.get(s.id)?.value.trim().length ?? 0) > 0);
}

/** The UTC calendar day of an ISO timestamp, as an epoch-ms at midnight (for day-granular comparisons). */
function utcDay(iso: string): number {
  const d = new Date(iso);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * True when this attempt meets the question sheet's due date: every slot is filled in and the attempt's
 * assigned date falls on or between the day the question sheet was created and its due date (both
 * inclusive). A question sheet with no due date, or an attempt with no assigned date, is never met.
 * Compared at day granularity so an attempt dated the same day the sheet was created still counts.
 */
export function answerSheetMeetsDueDate(qs: QuestionSheet, as: AnswerSheet): boolean {
  if (!qs.dueDate || !as.date) return false;
  if (!isAnswerSheetComplete(qs, as)) return false;
  const answered = utcDay(as.date);
  return answered >= utcDay(qs.createdAt) && answered <= utcDay(qs.dueDate);
}

/** True when any of the given attempts meets the question sheet's due date. */
export function dueDateMet(qs: QuestionSheet, answerSheets: AnswerSheet[]): boolean {
  return answerSheets.some(as => answerSheetMeetsDueDate(qs, as));
}

import type { QuestionSheet } from "@sentence-bank/types";

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
  for (const question of qs.questions) {
    if (question.parts && question.parts.length > 0) {
      for (const part of question.parts) {
        slots.push({
          id: part.id,
          label: `${question.prompt} — ${part.label}`,
        });
      }
    }
    else {
      slots.push({
        id: question.id,
        label: question.prompt,
      });
    }
  }
  return slots;
}

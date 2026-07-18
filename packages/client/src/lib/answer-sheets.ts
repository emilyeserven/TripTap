import type {
  AnswerSheet,
  AnswerSheetEntry,
  LearningArea,
  QuestionSheet,
  QuestionSheetPart,
} from "@sentence-bank/types";

/** One answerable cell of a question sheet: a stable `id` and a human label for the input. */
export interface QuestionSheetSlot {
  id: string;
  label: string;
}

/**
 * Walk a part subtree, appending one slot per **leaf** part (a part with no sub-parts). A part that has
 * sub-parts is a heading, not a slot — only its leaf descendants are answerable. `base` is the label
 * built from the ancestors so far (question prompt + any parent part labels).
 */
function collectPartSlots(base: string, parts: QuestionSheetPart[], slots: QuestionSheetSlot[]): void {
  for (const part of parts) {
    const label = `${base} — ${part.label}`;
    if (part.parts && part.parts.length > 0) {
      collectPartSlots(label, part.parts, slots);
    }
    else {
      slots.push({
        id: part.id,
        label,
      });
    }
  }
}

/**
 * Flatten a question sheet into its answerable slots, in display order. This is the single source of
 * truth shared by the answer form (which renders one input per slot) and the read-only views.
 *
 * - `list` layout: a question with no parts is one slot (`id = q.id`); otherwise each **leaf** part is
 *   its own slot (`id = part.id`), labelled with the question prompt plus the chain of part labels. A
 *   part that has sub-parts is a heading, not a slot.
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
      collectPartSlots(base, question.parts, slots);
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

/** The sentinel filter value meaning "no filter applied" for the resource/learning-area dropdowns. */
export const ALL_FILTER = "all";

/** One `{ value, label }` choice for a filter dropdown. */
export interface FilterOption {
  value: string;
  label: string;
}

/**
 * Distinct resource (Textbook/Worksheet bookmark) filter options across the given question sheets,
 * with an "all" sentinel first. Sheets with no bookmark contribute nothing. Value = `bookmarkId`,
 * label = `bookmarkTitle`.
 */
export function resourceFilterOptions(sheets: QuestionSheet[]): FilterOption[] {
  const seen = new Map<string, string>();
  for (const s of sheets) {
    if (s.bookmarkId && !seen.has(s.bookmarkId)) {
      seen.set(s.bookmarkId, s.bookmarkTitle ?? s.bookmarkId);
    }
  }
  return [
    {
      value: ALL_FILTER,
      label: "All resources",
    },
    ...[...seen].map(([value, label]) => ({
      value,
      label,
    })),
  ];
}

/** True when a question sheet passes the resource filter (`ALL_FILTER` passes everything). */
export function matchesResource(qs: QuestionSheet | undefined, resource: string): boolean {
  return resource === ALL_FILTER || (qs?.bookmarkId ?? null) === resource;
}

/** True when a question sheet passes the Learning Area filter (`ALL_FILTER` passes everything). */
export function matchesLearningArea(qs: QuestionSheet | undefined, area: string): boolean {
  return area === ALL_FILTER || (qs?.learningAreas ?? []).includes(area as LearningArea);
}

/** A blank entry for one slot, ready to be filled by the review actions. */
export function emptyAnswerEntry(slotId: string): AnswerSheetEntry {
  return {
    slotId,
    value: "",
    correct: null,
    correction: null,
    reasoning: null,
    intendedMeaning: null,
    actualMeaning: null,
    marks: null,
  };
}

/** True once an entry holds anything worth saving (an answer, a review verdict, or a correction field). */
export function isEntryTouched(e: AnswerSheetEntry): boolean {
  return e.value.trim().length > 0
    || e.correct != null
    || Boolean(e.correction?.trim())
    || Boolean(e.reasoning?.trim())
    || Boolean(e.intendedMeaning?.trim())
    || Boolean(e.actualMeaning?.trim())
    || (e.marks?.length ?? 0) > 0;
}

/** True when an entry carries any correction detail worth showing beyond the raw answer. */
export function hasCorrectionDetail(e: AnswerSheetEntry): boolean {
  return Boolean(e.correction || e.reasoning || e.intendedMeaning || e.actualMeaning);
}

/** True once a slot has been engaged with — an answer, a verdict, or a correction. */
export function isEntryAnswered(e: AnswerSheetEntry): boolean {
  return e.value.trim().length > 0 || e.correct != null || hasCorrectionDetail(e);
}

/** Persist an inline correction built from span marks + typed insertions for one slot. */
export type SaveCorrection = (
  slotId: string,
  result: { correction: string;
    marks: AnswerSheetEntry["marks"];
    reasoning: string | null; },
) => void;

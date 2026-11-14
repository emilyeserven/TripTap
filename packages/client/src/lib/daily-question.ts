import type {
  AnswerSheet,
  AnswerSheetEntry,
  QuestionSheet,
  QuestionSheetPart,
} from "@sentence-bank/types";

import { questionAnswerChoices } from "@sentence-bank/types";

import {
  emptyAnswerEntry,
  hiddenSlotIds,
  isAnswerSheetComplete,
  questionSheetSlots,
} from "@/lib/answer-sheets";

/**
 * The "daily question": homework served one question at a time, so a backlog of question sheets gets
 * worked through a little each day instead of in one cram session. Everything here is derived on read
 * from the question sheets and their answer sheets — the only thing stored is the answer itself, which
 * goes into the sheet's current attempt (an ordinary answer sheet).
 */

/** One level of context above a question: its label (e.g. "Question 3", "(b)") and printed text. */
export interface DailyQuestionStep {
  label: string;
  text: string | null;
}

/** One answer slot described well enough to answer without the book. */
export interface DailyQuestionSlot {
  slotId: string;
  /** The ancestors' labels/instructions, outermost first (the question, then any heading parts). */
  context: DailyQuestionStep[];
  label: string;
  /** The question itself, when the sheet records it. */
  text: string | null;
  choices: string[] | null;
  /**
   * True when the slot can be answered from what the sheet stores — it has its own question text (or
   * is a grid cell, whose row label + column are the question). Label-only slots ("(a)") still need
   * the book, so they are never served as a daily question.
   */
  selfContained: boolean;
}

/** A daily-question pick: the slot, its sheet, and the attempt the answer will be saved into. */
export interface DailyQuestion extends DailyQuestionSlot {
  sheet: QuestionSheet;
  /** The sheet's in-progress attempt to save into, or `null` to start a new answer sheet. */
  answerSheet: AnswerSheet | null;
}

/**
 * True when a question's prompt is only a numbering label ("A", "3", "(ii)", "Question 4") rather than
 * the question itself — quick-fill seeds prompts this way, and those still need the book open.
 */
export function isLabelOnlyPrompt(prompt: string): boolean {
  const p = prompt.trim();
  if (p.length === 0) return true;
  if (/^question\s*\d+$/i.test(p)) return true;
  return /^[(（]?(?:[0-9０-９]{1,3}|[A-Za-z]{1,3}|[ivxlcIVXLC]{1,6}|[①-⑳]|[一二三四五六七八九十]{1,3})[)）.．:：]?$/.test(p);
}

/** Leaf slots of a part subtree with the chain of heading parts above each. */
function collectParts(
  parts: QuestionSheetPart[],
  context: DailyQuestionStep[],
  choices: string[] | null,
  out: DailyQuestionSlot[],
): void {
  for (const part of parts) {
    const text = part.text?.trim() || null;
    if (part.parts && part.parts.length > 0) {
      collectParts(part.parts, [...context, {
        label: part.label,
        text,
      }], choices, out);
    }
    else {
      out.push({
        slotId: part.id,
        context,
        label: part.label,
        text,
        choices,
        selfContained: text !== null,
      });
    }
  }
}

/**
 * Every answer slot of a sheet with the context needed to answer it on its own, in sheet order. The
 * slot ids match {@link questionSheetSlots}, so answers saved here land where the answer-sheet editor
 * expects them.
 */
export function dailyQuestionSlots(qs: QuestionSheet): DailyQuestionSlot[] {
  if (qs.layout === "grid") {
    const grid = qs.grid;
    if (!grid) return [];
    return grid.rows.flatMap(row => grid.columns.map((column, colIndex) => ({
      slotId: `${row.id}:${colIndex}`,
      context: [],
      label: row.label,
      text: column,
      choices: null,
      selfContained: row.label.trim().length > 0 && column.trim().length > 0,
    })));
  }

  const out: DailyQuestionSlot[] = [];
  const firstNumber = qs.firstQuestionNumber ?? 1;
  qs.questions.forEach((question, index) => {
    const labelOnly = isLabelOnlyPrompt(question.prompt);
    const step: DailyQuestionStep = {
      label: labelOnly && question.prompt.trim()
        ? question.prompt.trim()
        : `Question ${firstNumber + index}`,
      text: labelOnly ? null : question.prompt.trim(),
    };
    const choices = questionAnswerChoices(question);
    if (question.parts && question.parts.length > 0) {
      collectParts(question.parts, [step], choices, out);
    }
    else {
      out.push({
        slotId: question.id,
        context: [],
        label: step.label,
        text: step.text,
        choices,
        selfContained: step.text !== null,
      });
    }
  });
  return out;
}

/** Epoch ms of an ISO date, or +Infinity when absent (so undated sorts last). */
function timeOr(iso: string | null, fallback: number): number {
  return iso ? new Date(iso).getTime() : fallback;
}

/**
 * The attempt a sheet's daily answers go into: its most recently updated answer sheet. `undefined`
 * means the sheet is already finished (some attempt is complete) and has nothing left to serve; `null`
 * means it has no attempt yet, so the first daily answer starts one.
 */
export function workingAnswerSheet(
  qs: QuestionSheet,
  answerSheets: AnswerSheet[],
): AnswerSheet | null | undefined {
  const attempts = answerSheets.filter(as => as.questionSheetId === qs.id);
  if (attempts.some(as => isAnswerSheetComplete(qs, as))) return undefined;
  return [...attempts].sort((a, b) => timeOr(b.updatedAt, 0) - timeOr(a.updatedAt, 0))[0] ?? null;
}

/**
 * Every unanswered, self-contained slot across the learner's unfinished question sheets, in the order
 * they should be served: sheets due soonest first (undated last), then sheets already in progress
 * (finish what's started), then the oldest sheet; within a sheet, in question order. Slots in parts
 * hidden for the attempt, and slots already answered in it, are skipped.
 */
export function dailyQuestionQueue(
  sheets: QuestionSheet[],
  answerSheets: AnswerSheet[],
): DailyQuestion[] {
  const pending = sheets.flatMap((sheet) => {
    const answerSheet = workingAnswerSheet(sheet, answerSheets);
    if (answerSheet === undefined) return [];
    const hidden = answerSheet ? hiddenSlotIds(sheet, answerSheet) : new Set<string>();
    const answered = new Set(
      (answerSheet?.entries ?? []).filter(e => e.value.trim().length > 0).map(e => e.slotId),
    );
    const questions = dailyQuestionSlots(sheet)
      .filter(s => s.selfContained && !hidden.has(s.slotId) && !answered.has(s.slotId))
      .map(s => ({
        ...s,
        sheet,
        answerSheet,
      }));
    return questions.length > 0
      ? [{
        sheet,
        started: answered.size > 0,
        questions,
      }]
      : [];
  });

  pending.sort((a, b) =>
    timeOr(a.sheet.dueDate, Infinity) - timeOr(b.sheet.dueDate, Infinity)
    || Number(b.started) - Number(a.started)
    || timeOr(a.sheet.createdAt, 0) - timeOr(b.sheet.createdAt, 0));

  return pending.flatMap(p => p.questions);
}

/**
 * The attempt's entries with `value` recorded for `slotId` — replacing that slot's answer if it had
 * one, keeping every other entry (and its review fields), and ordering by the sheet's slot order so
 * the stored array reads like the sheet.
 */
export function entriesWithAnswer(
  qs: QuestionSheet,
  existing: AnswerSheetEntry[],
  slotId: string,
  value: string,
): AnswerSheetEntry[] {
  const bySlot = new Map(existing.map(e => [e.slotId, e] as const));
  bySlot.set(slotId, {
    ...(bySlot.get(slotId) ?? emptyAnswerEntry(slotId)),
    value,
  });
  const order = new Map(questionSheetSlots(qs).map((s, i) => [s.id, i] as const));
  return [...bySlot.values()].sort(
    (a, b) => (order.get(a.slotId) ?? Infinity) - (order.get(b.slotId) ?? Infinity),
  );
}

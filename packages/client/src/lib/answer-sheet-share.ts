import type { AnswerSheet, QuestionSheet, QuestionSheetPart } from "@sentence-bank/types";

import { questionSheetDisplayTitle } from "@/lib/answer-sheets";
import { isLabelOnlyPrompt } from "@/lib/daily-question";
import { formatDueDate } from "@/lib/due-date";

/** Options for {@link formatAnswerSheetForTeacher}. */
export interface TeacherShareOptions {
  /** Repeat each question's text above the answer, so the teacher needn't have the book open. */
  includeQuestions: boolean;
  /** List unanswered slots too (shown as "—"), so gaps are visible; otherwise they're left out. */
  includeUnanswered: boolean;
}

const BLANK = "—";

/**
 * An answer sheet as plain text to paste into a message to a teacher (chat apps and email both keep
 * plain text intact, unlike Markdown). Questions keep their printed numbering and part labels, nested
 * parts indent under their heading, and each answer sits on its own "→" line so it's easy to mark up:
 *
 * ```
 * Genki I Workbook — Lesson 3 (p. 12)
 * Nov 14, 2026
 *
 * 1. Fill in the blanks with the correct particle.
 *    (a) 東京＿＿行きます。
 *        → に
 * ```
 *
 * Parts hidden for this attempt are skipped; a question whose every slot is skipped is dropped.
 */
export function formatAnswerSheetForTeacher(
  qs: QuestionSheet,
  as: AnswerSheet,
  options: TeacherShareOptions,
): string {
  const answers = new Map(
    as.entries.map(e => [e.slotId, e.value.trim()] as const),
  );
  const answerOf = (slotId: string): string | null => {
    const value = answers.get(slotId);
    if (value) return value;
    return options.includeUnanswered ? BLANK : null;
  };

  const heading = [
    `${questionSheetDisplayTitle(qs)}${qs.page ? ` (${qs.page})` : ""}`,
    as.date ? formatDueDate(as.date) : null,
  ].filter(Boolean).join("\n");

  const blocks: string[] = [];
  if (qs.layout === "grid" && qs.grid) {
    const {
      columns, rows,
    } = qs.grid;
    for (const row of rows) {
      const lines = columns.flatMap((column, i) => {
        const value = answerOf(`${row.id}:${i}`);
        return value === null ? [] : [`   ${column}: ${value}`];
      });
      if (lines.length > 0) blocks.push([row.label, ...lines].join("\n"));
    }
  }
  else {
    const hidden = new Set(as.hiddenPartIds ?? []);
    const firstNumber = qs.firstQuestionNumber ?? 1;
    qs.questions.forEach((q, index) => {
      if (hidden.has(q.id)) return;
      const prompt = q.prompt.trim();
      const number = `${firstNumber + index}.`;
      // A label-only prompt ("A", "(ii)") *is* the printed number, so it replaces the positional one.
      const header = isLabelOnlyPrompt(prompt)
        ? (prompt ? (/[.)）．]$/.test(prompt) ? prompt : `${prompt}.`) : number)
        : (options.includeQuestions ? `${number} ${prompt}` : number);
      const parts = q.parts ?? [];
      if (parts.length === 0) {
        const value = answerOf(q.id);
        if (value !== null) blocks.push(`${header}\n   → ${value}`);
        return;
      }
      const lines = partLines(parts, "   ", answerOf, options.includeQuestions);
      if (lines.length > 0) blocks.push([header, ...lines].join("\n"));
    });
  }

  return [heading, ...blocks].join("\n\n");
}

/** The lines for a part subtree: each part's label (+ text), then its answer or its sub-parts. */
function partLines(
  parts: QuestionSheetPart[],
  indent: string,
  answerOf: (slotId: string) => string | null,
  includeQuestions: boolean,
): string[] {
  return parts.flatMap((part) => {
    const text = includeQuestions ? part.text?.trim() : undefined;
    const line = `${indent}${[part.label.trim(), text].filter(Boolean).join(" ")}`;
    const kids = part.parts ?? [];
    if (kids.length > 0) {
      const childLines = partLines(kids, `${indent}   `, answerOf, includeQuestions);
      return childLines.length > 0 ? [line, ...childLines] : [];
    }
    const value = answerOf(part.id);
    if (value === null) return [];
    // Indent the answer under the part's text so it lines up below the question, not the label.
    return [line, `${indent}    → ${value}`];
  });
}

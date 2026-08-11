import type {
  AnswerSheet,
  CorrectionLog,
  DrillSession,
  Lesson,
  QuestionSheet,
  ReadingSession,
  RuleGroup,
  Sentence,
  Writing,
} from "@sentence-bank/types";

import {
  answerSheetScore,
  dueDateMet,
  isAnswerSheetComplete,
  questionSheetDisplayTitle,
} from "@/lib/answer-sheets";
import { flaggedRecurringQuestions } from "@/lib/drill-recurring";
import { formatDueDate, isDueSoon, isOverdue } from "@/lib/due-date";

/**
 * The unified "needs your attention" inbox: one pure assembly over the lists the app already
 * fetches, composing the per-feature "deal with this later" markers that used to live scattered
 * (needs-correction sentences, ungraded sheets, unbanked word notes, unmade flashcards, recurring
 * drill mistakes, build-ready rule groups, rewrite-ready writings, due question sheets).
 *
 * There is deliberately no dismissal/snooze state: every kind except `rewrite-ready` clears itself
 * when acted on (the action mutates the row the filter reads), and recurring drill mistakes age out
 * of their 7-day window. Rewrite-ready items linger until rewritten — accepted for now; a snooze in
 * the Start settings blob is the v2 escape hatch if it grates.
 */

export type AttentionKind
  = | "sentence-correction"
    | "ungraded-sheet"
    | "word-note-sentence"
    | "flashcard-pending"
    | "recurring-drill"
    | "rule-group-ready"
    | "rewrite-ready"
    | "sheet-due";

/** One actionable row of the inbox, deep-linked to the exact place to act. */
export interface AttentionItem {
  kind: AttentionKind;
  /** Stable within the kind: entity id, normalized question key, or rule tag key. */
  id: string;
  title: string;
  /** Count or age, e.g. "3 of 12 graded", "missed in 4 drills"; null when the title says it all. */
  detail: string | null;
  /** Render the detail badge as destructive (e.g. overdue). */
  destructive?: boolean;
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string | boolean>;
  /** Sort key within the group: higher = shown first. */
  urgency: number;
}

/** One kind's worth of items, capped for display but with the uncapped total. */
export interface AttentionGroup {
  kind: AttentionKind;
  label: string;
  /** Items capped at {@link ATTENTION_GROUP_DISPLAY_LIMIT}, most urgent first. */
  items: AttentionItem[];
  /** Total before capping — cards show this. */
  count: number;
  /** Where "see all" goes; omitted when the inbox page itself is the only aggregate view. */
  to?: string;
  search?: Record<string, string | boolean>;
}

/** Everything the inbox reads — the already-cached list queries, plus an injectable clock. */
export interface AttentionInputs {
  mySentences: Sentence[];
  questionSheets: QuestionSheet[];
  answerSheets: AnswerSheet[];
  readingSessions: ReadingSession[];
  lessons: Lesson[];
  drillSessions: DrillSession[];
  correctionLog: CorrectionLog | null;
  ruleGroups: RuleGroup[];
  writings: Writing[];
  now: Date;
}

/** Cap on rows shown per group; the group's `count` still reports the uncapped total. */
export const ATTENTION_GROUP_DISPLAY_LIMIT = 5;
/** Days after which a corrected writing is ready to rewrite blind (shared with the rewrite page). */
const REWRITE_READY_DAYS = 7;
/** How far ahead (in days) a due question sheet counts as "due soon". */
const DUE_SOON_DAYS = 7;

/** Days since an ISO/date string (fractional). */
function daysSince(value: string, now: Date): number {
  return (now.getTime() - new Date(value).getTime()) / 86_400_000;
}

/** Whole-day age label: "today", "1 day old", "N days old". */
function ageLabel(value: string, now: Date): string {
  const days = Math.floor(daysSince(value, now));
  if (days <= 0) return "today";
  return days === 1 ? "1 day old" : `${days} days old`;
}

/** First non-empty line of a sentence/writing, truncated for a row title. */
function truncate(text: string, max = 60): string {
  const line = text.split("\n")[0].trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

/** My Sentences still flagged `needsCorrection`, newest first. */
export function sentencesToCorrect(mySentences: Sentence[], now: Date): AttentionItem[] {
  return mySentences
    .filter(ms => ms.needsCorrection)
    .map(ms => ({
      kind: "sentence-correction" as const,
      id: ms.id,
      title: truncate(ms.text) || "Untitled sentence",
      detail: ageLabel(ms.createdAt, now),
      to: "/sentences/$id",
      params: {
        id: ms.id,
      },
      urgency: new Date(ms.createdAt).getTime(),
    }))
    .sort((a, b) => b.urgency - a.urgency);
}

/** Complete answer sheets not yet fully graded, newest first. */
export function ungradedSheets(
  questionSheets: QuestionSheet[],
  answerSheets: AnswerSheet[],
): AttentionItem[] {
  const parentById = new Map(questionSheets.map(qs => [qs.id, qs] as const));
  const items: AttentionItem[] = [];
  for (const as of answerSheets) {
    const qs = parentById.get(as.questionSheetId);
    if (!qs || !isAnswerSheetComplete(qs, as)) continue;
    const score = answerSheetScore(qs, as);
    if (score.graded >= score.total) continue;
    items.push({
      kind: "ungraded-sheet",
      id: as.id,
      title: as.title ?? questionSheetDisplayTitle(qs),
      detail: `${score.graded} of ${score.total} graded`,
      to: "/answer-sheets/$id/edit",
      params: {
        id: as.id,
      },
      urgency: new Date(as.updatedAt).getTime(),
    });
  }
  return items.sort((a, b) => b.urgency - a.urgency);
}

/** Reading sessions with word notes not yet banked into a My Sentence, newest first. */
export function wordNotesToBank(readingSessions: ReadingSession[]): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const session of readingSessions) {
    const unbanked = (session.wordNotes ?? []).filter(w => !w.mySentenceId).length;
    if (unbanked === 0) continue;
    items.push({
      kind: "word-note-sentence",
      id: session.id,
      title: session.title,
      detail: unbanked === 1 ? "1 word to bank" : `${unbanked} words to bank`,
      to: "/reading-sessions/$id",
      params: {
        id: session.id,
      },
      urgency: new Date(session.createdAt).getTime(),
    });
  }
  return items.sort((a, b) => b.urgency - a.urgency);
}

/**
 * Reading sessions and lessons with flashcard-flagged word notes whose card was never made
 * (`flashcard` set, `flashcardMadeAt` empty — older rows without the field count as not made).
 */
export function flashcardsPending(
  readingSessions: ReadingSession[],
  lessons: Lesson[],
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const detailOf = (n: number) => (n === 1 ? "1 flashcard to make" : `${n} flashcards to make`);
  for (const session of readingSessions) {
    const pending = (session.wordNotes ?? []).filter(w => w.flashcard && !w.flashcardMadeAt).length;
    if (pending === 0) continue;
    items.push({
      kind: "flashcard-pending",
      id: session.id,
      title: session.title,
      detail: detailOf(pending),
      to: "/reading-sessions/$id",
      params: {
        id: session.id,
      },
      urgency: new Date(session.createdAt).getTime(),
    });
  }
  for (const lesson of lessons) {
    const pending = (lesson.wordNotes ?? []).filter(w => w.flashcard && !w.flashcardMadeAt).length;
    if (pending === 0) continue;
    items.push({
      kind: "flashcard-pending",
      id: lesson.id,
      title: lesson.title ?? `Lesson — ${lesson.date}`,
      detail: detailOf(pending),
      to: "/lessons/$id",
      params: {
        id: lesson.id,
      },
      urgency: new Date(lesson.createdAt).getTime(),
    });
  }
  return items.sort((a, b) => b.urgency - a.urgency);
}

/** Drill questions missed across enough recent sessions to be flagged, most frequent first. */
export function recurringDrills(drillSessions: DrillSession[], now: Date): AttentionItem[] {
  return flaggedRecurringQuestions(drillSessions, now).map((r, index) => ({
    kind: "recurring-drill" as const,
    id: r.key,
    title: r.question,
    detail: `missed in ${r.sessionCount} drills`,
    to: "/drill-sessions/stats",
    // flaggedRecurringQuestions already sorts most-frequent first; preserve its order.
    urgency: -index,
  }));
}

/** Rule tags past the recurrence gate with no rule group built yet, most strikes first. */
export function ruleGroupsReady(
  correctionLog: CorrectionLog | null,
  ruleGroups: RuleGroup[],
): AttentionItem[] {
  const existing = new Set(ruleGroups.map(g => g.ruleTagKey));
  return (correctionLog?.ruleGaps ?? [])
    .filter(g => g.meetsGate && !existing.has(g.ruleTagKey))
    .map(g => ({
      kind: "rule-group-ready" as const,
      id: g.ruleTagKey,
      title: g.ruleTagLabel ?? g.ruleTagKey,
      detail: g.occurrenceCount === 1 ? "1 strike" : `${g.occurrenceCount} strikes`,
      to: "/corrections/groups",
      urgency: g.occurrenceCount,
    }))
    .sort((a, b) => b.urgency - a.urgency);
}

/** Corrected writings at least {@link REWRITE_READY_DAYS} old — shared with the rewrite-blind page. */
export function rewriteReadyWritings(writings: Writing[], now: Date): Writing[] {
  return writings.filter(w =>
    (w.corrections?.length ?? 0) > 0 && daysSince(w.createdAt, now) >= REWRITE_READY_DAYS);
}

/** Writings ready to rewrite blind, oldest first (stable — the group caps at 5). */
export function rewriteReady(writings: Writing[], now: Date): AttentionItem[] {
  return rewriteReadyWritings(writings, now)
    .map((w) => {
      const corrections = w.corrections?.length ?? 0;
      return {
        kind: "rewrite-ready" as const,
        id: w.id,
        title: w.promptTitle ?? (truncate(w.text, 40) || "Untitled"),
        detail: `${ageLabel(w.createdAt, now)} · ${corrections} correction${corrections === 1 ? "" : "s"}`,
        to: "/my-writing/rewrite",
        urgency: daysSince(w.createdAt, now),
      };
    })
    .sort((a, b) => b.urgency - a.urgency);
}

function hasDueDate(sheet: QuestionSheet): sheet is QuestionSheet & { dueDate: string } {
  return sheet.dueDate !== null;
}

/** Question sheets overdue or due within {@link DUE_SOON_DAYS} days and not yet met, earliest first. */
export function dueSheets(
  questionSheets: QuestionSheet[],
  answerSheets: AnswerSheet[],
  now: Date,
): AttentionItem[] {
  return questionSheets
    .filter(hasDueDate)
    .filter(s => isDueSoon(s.dueDate, now, DUE_SOON_DAYS))
    // Drop sheets already met by a completed, in-window answer sheet — they no longer need attention.
    .filter(s => !dueDateMet(s, answerSheets.filter(as => as.questionSheetId === s.id)))
    .map(s => ({
      kind: "sheet-due" as const,
      id: s.id,
      title: questionSheetDisplayTitle(s),
      detail: `Due ${formatDueDate(s.dueDate)}`,
      destructive: isOverdue(s.dueDate, now),
      to: "/question-sheets/$id",
      params: {
        id: s.id,
      },
      urgency: -new Date(s.dueDate).getTime(),
    }))
    .sort((a, b) => b.urgency - a.urgency);
}

/** Cap a kind's items for display, keeping the uncapped total on the group. */
function toGroup(
  kind: AttentionKind,
  label: string,
  items: AttentionItem[],
  link?: Pick<AttentionGroup, "to" | "search">,
): AttentionGroup {
  return {
    kind,
    label,
    items: items.slice(0, ATTENTION_GROUP_DISPLAY_LIMIT),
    count: items.length,
    ...link,
  };
}

/** Assemble the inbox: one group per kind with any items, in a fixed display order. */
export function buildAttention(inputs: AttentionInputs): AttentionGroup[] {
  const groups: AttentionGroup[] = [
    toGroup(
      "sheet-due",
      "Question sheets due soon",
      dueSheets(inputs.questionSheets, inputs.answerSheets, inputs.now),
      {
        to: "/question-sheets",
      },
    ),
    toGroup(
      "sentence-correction",
      "Sentences to correct",
      sentencesToCorrect(inputs.mySentences, inputs.now),
      {
        to: "/sentences",
        search: {
          view: "mine",
          needsCorrection: true,
        },
      },
    ),
    toGroup(
      "ungraded-sheet",
      "Answer sheets to grade",
      ungradedSheets(inputs.questionSheets, inputs.answerSheets),
      {
        to: "/answer-sheets",
      },
    ),
    toGroup("word-note-sentence", "Words to bank", wordNotesToBank(inputs.readingSessions), {
      to: "/reading-sessions",
    }),
    toGroup(
      "flashcard-pending",
      "Flashcards to make",
      flashcardsPending(inputs.readingSessions, inputs.lessons),
    ),
    toGroup(
      "recurring-drill",
      "Recurring drill mistakes",
      recurringDrills(inputs.drillSessions, inputs.now),
      {
        to: "/drill-sessions/stats",
      },
    ),
    toGroup(
      "rule-group-ready",
      "Rule groups ready to build",
      ruleGroupsReady(inputs.correctionLog, inputs.ruleGroups),
      {
        to: "/corrections/groups",
      },
    ),
    toGroup("rewrite-ready", "Ready to rewrite blind", rewriteReady(inputs.writings, inputs.now), {
      to: "/my-writing/rewrite",
    }),
  ];
  return groups.filter(g => g.count > 0);
}

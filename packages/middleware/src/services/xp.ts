import type {
  AnswerSheetEntry,
  DialogueLine,
  DrillMistake,
  DrillType,
  LearnerGoal,
  LearningArea,
  LessonListeningNote,
  LessonWordNote,
  ListeningEntry,
  PracticePasses,
  QuestionSheetLayout,
  ReadingLine,
  TheoryDensity,
  TheoryEntryMode,
  Triage,
  WordNote,
  WritingCorrection,
  XpAreaSummary,
  XpDayAreas,
  XpFeature,
  XpRates,
  XpSummary,
} from "@sentence-bank/types";
import { DEFAULT_XP_RATES, LEARNING_AREAS } from "@sentence-bank/types";
import { db } from "@/db";
import {
  answerSheets,
  corrections,
  dialogues,
  drillSessions,
  lessons,
  listeningSessions,
  mySentences,
  practiceSentences,
  questionSheets,
  readingSessions,
  shadowingSessions,
  theorySessions,
  writings,
} from "@/db/schema";
import { getLearnerProfile, getXpRates } from "@/services/settings";
import { computeStreak } from "@/services/streak";

/**
 * XP is *derived*: every function here recounts the learner's persisted content instead of reading a
 * ledger, so all historical work counts and the numbers can never drift from reality. Each grant is
 * attributed to a {@link LearningArea}; multi-area question sheets split their XP evenly so the totals
 * stay conserved and don't bias the "lowest area" recommendation.
 */
export interface XpGrant {
  area: LearningArea;
  feature: XpFeature;
  xp: number;
  /** When the work happened, for the recent-window rollup. */
  at: Date;
  /**
   * The learner-entered calendar date (YYYY-MM-DD) for date-only sources (drills, lessons). Their
   * `at` is midnight UTC, which lands on the wrong local day for non-UTC users — the today rollup
   * compares this string directly instead.
   */
  dateOnly?: string;
  /**
   * Optional attribution for the daily activity log. `sourceId` identifies the row that produced the
   * grant so multi-grant sources (a lesson's listening + vocab, a sheet's areas) merge into one
   * activity item; `title`/`to`/`params` link it. `summarizeGrants` ignores these.
   */
  sourceId?: string;
  title?: string | null;
  to?: string;
  params?: Record<string, string>;
  /**
   * The extra XP this grant earned for aligning with a learner goal (the +0.25x portion, already
   * folded into `xp`). Absent/0 when the grant's area isn't targeted by any goal.
   */
  goalBonusXp?: number;
}

/** The extra multiplier XP earns when its area is targeted by one of the learner's goals. */
const GOAL_ALIGNMENT_BONUS = 0.25;

/**
 * Reward grants whose learning area is targeted by a learner goal: their XP is scaled by
 * `1 + GOAL_ALIGNMENT_BONUS`, with the added portion recorded in `goalBonusXp` so the breakdown and
 * activity log can highlight it. Grants in un-targeted areas pass through unchanged, and with no goals
 * the whole list is returned untouched.
 */
export function applyGoalBonus(grants: XpGrant[], goals: LearnerGoal[]): XpGrant[] {
  const goalAreas = new Set<LearningArea>(goals.flatMap(goal => goal.learningAreas));
  if (goalAreas.size === 0) return grants;
  return grants.map((grant) => {
    if (!goalAreas.has(grant.area) || grant.xp <= 0) return grant;
    return {
      ...grant,
      xp: grant.xp * (1 + GOAL_ALIGNMENT_BONUS),
      goalBonusXp: grant.xp * GOAL_ALIGNMENT_BONUS,
    };
  });
}

/** Count the sentences in a free-text block: split on Japanese/latin terminators and newlines. */
export function countSentences(text: string | null): number {
  if (!text) return 0;
  return text
    .split(/[。．！？.!?\n]+/)
    .filter(part => part.trim().length > 0)
    .length;
}

/** A lesson word note counts as "fully filled out" once word, reading, and meaning are all present. */
export function isFilledWordNote(note: LessonWordNote): boolean {
  return Boolean(note.word?.trim() && note.reading?.trim() && note.meaning?.trim());
}

/**
 * The area a session's XP credits: the learner's choice when they made one, else the feature's
 * default. Before this, the default was the only option for reading, listening, shadowing and
 * lessons — their areas were hardcoded at the grant site, so a listening session spent on grammar
 * still credited Listening.
 */
function sessionArea<A extends LearningArea>(
  row: { learningArea?: LearningArea | null },
  fallback: A,
): LearningArea {
  return row.learningArea ?? fallback;
}

/**
 * Whether a session earns XP at all. Sourced-not-produced work opts out — the rationale dialogues
 * already used ("a script copied out of a textbook was sourced, not produced"), now available to
 * every session type.
 */
function earnsXp(row: { countsTowardXp?: boolean }): boolean {
  return row.countsTowardXp !== false;
}

/** Attribute `xp` to a sheet's learning areas, split evenly; sheets with none fall back to Grammar. */
function splitAcrossAreas(
  areas: LearningArea[] | null,
  feature: XpFeature,
  xp: number,
  at: Date,
  meta?: Pick<XpGrant, "sourceId" | "title" | "to" | "params" | "dateOnly">,
): XpGrant[] {
  const targets = areas && areas.length > 0 ? areas : ["Grammar" as const];
  return targets.map(area => ({
    area,
    feature,
    xp: xp / targets.length,
    at,
    ...meta,
  }));
}

interface ReadingXpRow {
  id: string;
  title: string;
  mode: string;
  difficulty: string | null;
  passive: boolean;
  timeSpentMinutes: number;
  freeformTranslation: string | null;
  freeformCorrection: string | null;
  freeformNote: string | null;
  freeformVerdict: string | null;
  lines: ReadingLine[] | null;
  wordNotes: WordNote[] | null;
  date: string;
  createdAt: Date;
  /** Learner-chosen area; absent/null falls back to the feature's default. */
  learningArea?: LearningArea | null;
  /** Absent is treated as true — only an explicit false opts the row out. */
  countsTowardXp?: boolean;
}

/** A translation earns only this fraction of the full rate when it wasn't verified as correct. */
const PARTIAL_TRANSLATION_CREDIT = 0.5;

/** Difficulty modifier on a reading session's earned XP; unset/unknown scores as medium (×1). */
function readingDifficultyMultiplier(difficulty: string | null): number {
  switch (difficulty) {
    case "very-easy":
      return 0.25;
    case "easy":
      return 0.5;
    case "hard":
      return 1.25;
    default:
      return 1;
  }
}

/**
 * Whether a translation earns full credit: it was self-assessed `correct`, or the learner did the
 * corrective work of recording a reference translation and/or a comment. Anything else — marked wrong,
 * marked partial, or simply left unassessed — earns only partial credit.
 */
function translationEarnsFullCredit(
  verdict: string | null,
  correction: string | null,
  note: string | null,
): boolean {
  return verdict === "correct" || Boolean(correction?.trim()) || Boolean(note?.trim());
}

/**
 * Reading XP → Reading. A **passive** session (just reading, no translation/notes) earns
 * `readingPassiveMinute` per minute read. An **active** session earns 2xp per translated sentence +
 * 1xp per word note: a translation earns full credit when it's self-assessed correct or backed by a
 * reference translation/comment, half credit otherwise (see {@link translationEarnsFullCredit}); a word
 * note only earns its XP once the learner has written a sentence from it (`mySentenceId` set). Either
 * way the session's XP is scaled by its difficulty modifier (see {@link readingDifficultyMultiplier}).
 */
export function readingXp(rows: ReadingXpRow[], rates: XpRates = DEFAULT_XP_RATES): XpGrant[] {
  return rows.flatMap((row) => {
    let base: number;
    if (row.passive) {
      base = Math.max(0, row.timeSpentMinutes) * rates.readingPassiveMinute;
    }
    else {
      const full = rates.readingTranslatedSentence;
      const partial = full * PARTIAL_TRANSLATION_CREDIT;
      let translatedXp: number;
      if (row.mode === "line-by-line") {
        translatedXp = (row.lines ?? [])
          .filter(line => line.translation?.trim())
          .reduce(
            (sum, line) =>
              sum + (translationEarnsFullCredit(line.verdict, line.correction, line.note) ? full : partial),
            0,
          );
      }
      else {
        const sentences = countSentences(row.freeformTranslation);
        const rate = translationEarnsFullCredit(row.freeformVerdict, row.freeformCorrection, row.freeformNote)
          ? full
          : partial;
        translatedXp = sentences * rate;
      }
      const bankedWords = (row.wordNotes ?? []).filter(note => note.mySentenceId).length;
      base = translatedXp + bankedWords * rates.readingWordNote;
    }
    const xp = earnsXp(row) ? base * readingDifficultyMultiplier(row.difficulty) : 0;
    return xp > 0
      ? [{
        area: sessionArea(row, "Reading"),
        feature: "reading" as const,
        xp,
        at: new Date(row.date),
        dateOnly: row.date,
        sourceId: row.id,
        title: row.title,
        to: "/reading-sessions/$id",
        params: {
          id: row.id,
        },
      }]
      : [];
  });
}

interface WritingXpRow {
  id: string;
  text: string;
  corrections: WritingCorrection[] | null;
  date: string;
  createdAt: Date;
}

interface MySentenceXpRow {
  id: string;
  writingId: string | null;
  correction: string | null;
  createdAt: Date;
}

/**
 * 1xp per sentence written + 1xp per correction → Writing. My Sentences promoted from a writing
 * (`writingId` set) are skipped: their sentence and correction were already counted on the writing.
 */
export function writingXp(
  rows: WritingXpRow[],
  sentences: MySentenceXpRow[],
  rates: XpRates = DEFAULT_XP_RATES,
): XpGrant[] {
  const fromWritings = rows.flatMap((row) => {
    const xp = countSentences(row.text) * rates.writingSentence
      + (row.corrections?.length ?? 0) * rates.writingCorrection;
    return xp > 0
      ? [{
        area: "Writing" as const,
        feature: "writing" as const,
        xp,
        at: new Date(row.date),
        dateOnly: row.date,
        sourceId: row.id,
        title: null,
        to: "/my-writing/$id",
        params: {
          id: row.id,
        },
      }]
      : [];
  });
  const fromSentences = sentences
    .filter(row => row.writingId == null)
    .map(row => ({
      area: "Writing" as const,
      feature: "writing" as const,
      xp: rates.writingSentence + (row.correction ? rates.writingCorrection : 0),
      at: row.createdAt,
      sourceId: row.id,
      title: null,
      to: "/my-sentences",
    }));
  return [...fromWritings, ...fromSentences];
}

interface QuestionSheetXpRow {
  id: string;
  title: string;
  layout: string;
  learningAreas: LearningArea[] | null;
  createdAt: Date;
}

interface AnswerSheetXpRow {
  id: string;
  title: string | null;
  questionSheetId: string;
  entries: AnswerSheetEntry[] | null;
  /** The attempt's learner-assigned date (the day the work was done); null when undated. */
  date: Date | null;
  createdAt: Date;
  /** When the attempt was last edited — the best proxy for "when answered" if it has no date. */
  updatedAt: Date;
}

/**
 * 5xp per authored sheet; 2xp per answered entry (0.25xp on grid/table sheets) → the sheet's own
 * learning areas. Answer sheets whose sheet no longer exists fall back to Grammar at the list rate.
 *
 * Answering XP lands on the day the work was done — the attempt's learner-assigned `date` (falling back
 * to when it was last edited) — not when the (initially-empty) attempt was created, so continuing a
 * sheet on a later day still credits that day. Attempts carry a midnight-UTC `date`, so it's passed as
 * a `dateOnly` calendar day to avoid a timezone shifting it onto the wrong day.
 */
export function bookExercisesXp(
  sheets: QuestionSheetXpRow[],
  answers: AnswerSheetXpRow[],
  rates: XpRates = DEFAULT_XP_RATES,
): XpGrant[] {
  const byId = new Map(sheets.map(sheet => [sheet.id, sheet]));
  const authored = sheets.flatMap(sheet => splitAcrossAreas(
    sheet.learningAreas,
    "bookExercises",
    rates.questionSheetAuthored,
    sheet.createdAt,
    {
      sourceId: sheet.id,
      title: sheet.title,
      to: "/question-sheets/$id",
      params: {
        id: sheet.id,
      },
    },
  ));
  const answered = answers.flatMap((answer) => {
    const entryCount = answer.entries?.length ?? 0;
    if (entryCount === 0) return [];
    const sheet = byId.get(answer.questionSheetId);
    const rate = (sheet?.layout as QuestionSheetLayout) === "grid"
      ? rates.answerEntryGrid
      : rates.answerEntryList;
    // Credit the day the work was done: the attempt's date, else when it was last edited (not the
    // day the empty attempt was created). A dated attempt passes its calendar day as `dateOnly`.
    const when = answer.date ?? answer.updatedAt;
    return splitAcrossAreas(
      sheet?.learningAreas ?? null,
      "bookExercises",
      entryCount * rate,
      when,
      {
        sourceId: answer.id,
        title: answer.title ?? sheet?.title ?? null,
        to: "/answer-sheets/$id",
        params: {
          id: answer.id,
        },
        dateOnly: answer.date ? answer.date.toISOString().slice(0, 10) : undefined,
      },
    );
  });
  return [...authored, ...answered];
}

interface ListeningXpRow {
  id: string;
  title: string;
  entries: ListeningEntry[] | null;
  passive: boolean;
  durationMinutes: number;
  date: string;
  createdAt: Date;
  /** Learner-chosen area; absent/null falls back to the feature's default. */
  learningArea?: LearningArea | null;
  /** Absent is treated as true — only an explicit false opts the row out. */
  countsTowardXp?: boolean;
}

/**
 * Listening XP → Listening. A passive session (just listening, no notes) earns per minute of its
 * duration; a normal session earns per typed note. A session is one or the other.
 */
export function listeningXp(rows: ListeningXpRow[], rates: XpRates = DEFAULT_XP_RATES): XpGrant[] {
  return rows.flatMap((row) => {
    const base = row.passive
      ? row.durationMinutes * rates.listeningPassiveMinute
      : (row.entries?.length ?? 0) * rates.listeningEntry;
    const xp = earnsXp(row) ? base : 0;
    return xp > 0
      ? [{
        area: sessionArea(row, "Listening"),
        feature: "listening" as const,
        xp,
        at: new Date(row.date),
        dateOnly: row.date,
        sourceId: row.id,
        title: row.title,
        to: "/listening-sessions/$id",
        params: {
          id: row.id,
        },
      }]
      : [];
  });
}

interface ShadowingXpRow {
  id: string;
  title: string;
  completedLoops: number;
  date: string;
  createdAt: Date;
  /** Learner-chosen area; absent/null falls back to the feature's default. */
  learningArea?: LearningArea | null;
  /** Absent is treated as true — only an explicit false opts the row out. */
  countsTowardXp?: boolean;
}

/** 0.25xp per completed segment loop → Speaking. */
export function shadowingXp(rows: ShadowingXpRow[], rates: XpRates = DEFAULT_XP_RATES): XpGrant[] {
  return rows.flatMap(row => (row.completedLoops > 0 && earnsXp(row)
    ? [{
      area: sessionArea(row, "Speaking"),
      feature: "shadowing" as const,
      xp: row.completedLoops * rates.shadowingLoop,
      at: new Date(row.date),
      dateOnly: row.date,
      sourceId: row.id,
      title: row.title,
      to: "/shadowing/$id",
      params: {
        id: row.id,
      },
    }]
    : []));
}

interface DialogueXpRow {
  id: string;
  title: string;
  date: string;
  lines: DialogueLine[] | null;
  countsTowardXp: boolean;
  learningArea: LearningArea | null;
}

/**
 * 1xp per line → the dialogue's own learning area (Speaking by default). Only self-authored dialogues
 * count: a script copied out of a textbook was sourced, not produced, so it stays at zero until the
 * learner marks it as theirs.
 */
export function dialoguesXp(rows: DialogueXpRow[], rates: XpRates = DEFAULT_XP_RATES): XpGrant[] {
  return rows.flatMap((row) => {
    const lines = row.lines?.length ?? 0;
    if (!earnsXp(row) || lines === 0) return [];
    return [{
      area: sessionArea(row, "Speaking"),
      feature: "dialogues" as const,
      xp: lines * rates.dialogueLine,
      at: new Date(row.date),
      dateOnly: row.date,
      sourceId: row.id,
      title: row.title,
      to: "/dialogues/$id",
      params: {
        id: row.id,
      },
    }];
  });
}

interface DrillXpRow {
  id: string;
  title: string | null;
  date: string;
  questions: number;
  type: DrillType | null;
  learningArea: LearningArea | null;
  mistakes: DrillMistake[] | null;
}

/** A mistake is "corrected" (its penalty regained) once it has a correct answer and at least one reason. */
function isMistakeCorrected(mistake: DrillMistake): boolean {
  return Boolean(mistake.correctAnswer && mistake.correctAnswer.trim()) && mistake.reasons.length > 0;
}

/**
 * Drill XP → the session's chosen area, defaulting to Grammar. Questions score per-type
 * (`drillQuestionMultipleChoice` vs `drillQuestion`). Each logged mistake costs `drillMistakePenalty`,
 * regained in full by `drillMistakeCorrected` once it carries a correct answer + a reason — so a
 * session with only uncorrected mistakes yields negative XP.
 */
export function drillXp(rows: DrillXpRow[], rates: XpRates = DEFAULT_XP_RATES): XpGrant[] {
  return rows.flatMap((row) => {
    const mistakes = row.mistakes ?? [];
    if (row.questions <= 0 && mistakes.length === 0) return [];
    const questionXp = row.questions * (row.type === "multiple-choice"
      ? rates.drillQuestionMultipleChoice
      : rates.drillQuestion);
    const mistakeXp = mistakes.reduce(
      (sum, m) => sum - rates.drillMistakePenalty + (isMistakeCorrected(m) ? rates.drillMistakeCorrected : 0),
      0,
    );
    return [{
      area: sessionArea(row, "Grammar"),
      feature: "drills" as const,
      xp: questionXp + mistakeXp,
      at: new Date(row.date),
      dateOnly: row.date,
      sourceId: row.id,
      title: row.title,
      to: "/drill-sessions/$id",
      params: {
        id: row.id,
      },
    }];
  });
}

interface LessonXpRow {
  id: string;
  title: string | null;
  date: string;
  listeningNotes: LessonListeningNote[] | null;
  wordNotes: LessonWordNote[] | null;
  durationMinutes: number;
  /** Learner-chosen area; absent/null falls back to the feature's default. */
  learningArea?: LearningArea | null;
  /** Absent is treated as true — only an explicit false opts the row out. */
  countsTowardXp?: boolean;
}

/** Areas a tutoring session's minutes count toward — each earns the per-minute rate independently. */
const LESSON_MINUTE_AREAS = ["Speaking", "Listening", "Grammar"] as const;

/**
 * 1xp per line → Listening; 0.5xp per fully-filled word note → Vocabulary; plus the session's minutes
 * earn `lessonMinute` xp each toward every {@link LESSON_MINUTE_AREAS} area (Speaking/Listening/Grammar).
 *
 * When the learner picks an area for the lesson, the minutes credit that area alone instead of being
 * spread across all three — a lesson spent entirely on grammar shouldn't also bank Speaking time.
 * The per-line and per-word-note grants keep their intrinsic areas, since those measure what the
 * note *is* rather than how the hour was spent.
 */
export function lessonXp(rows: LessonXpRow[], rates: XpRates = DEFAULT_XP_RATES): XpGrant[] {
  return rows.flatMap((row) => {
    if (!earnsXp(row)) return [];
    const at = new Date(row.date);
    const meta = {
      sourceId: row.id,
      title: row.title,
      to: "/lessons/$id",
      params: {
        id: row.id,
      },
    };
    const grants: XpGrant[] = [];
    const lines = row.listeningNotes?.length ?? 0;
    if (lines > 0) {
      grants.push({
        area: "Listening",
        feature: "lessons",
        xp: lines * rates.lessonLine,
        at,
        dateOnly: row.date,
        ...meta,
      });
    }
    const filled = (row.wordNotes ?? []).filter(isFilledWordNote).length;
    if (filled > 0) {
      grants.push({
        area: "Vocabulary",
        feature: "lessons",
        xp: filled * rates.lessonWordNote,
        at,
        dateOnly: row.date,
        ...meta,
      });
    }
    if (row.durationMinutes > 0) {
      const minuteAreas = row.learningArea ? [row.learningArea] : LESSON_MINUTE_AREAS;
      for (const area of minuteAreas) {
        grants.push({
          area,
          feature: "lessons",
          xp: row.durationMinutes * rates.lessonMinute,
          at,
          dateOnly: row.date,
          ...meta,
        });
      }
    }
    return grants;
  });
}

interface TheoryStudyXpRow {
  id: string;
  title: string | null;
  date: string;
  entryMode: TheoryEntryMode;
  pages: number | null;
  density: TheoryDensity | null;
  wordCount: number | null;
  notesCount: number;
  learningArea: LearningArea | null;
}

/** Round `x` up to the nearest 0.25 (794/250 = 3.176 → 3.25). */
export function ceilToQuarter(x: number): number {
  return Math.ceil(x * 4) / 4;
}

/**
 * Theory study XP → the session's chosen area, defaulting to Grammar. In "pages" mode, pages × the
 * density's per-page rate; in "words" mode, the word count over 250 (rounded up to the nearest
 * quarter) at the per-250-words rate. Either way, plus a flat rate per self-reported note. Density
 * defaults to medium when unset.
 */
export function theoryStudyXp(rows: TheoryStudyXpRow[], rates: XpRates = DEFAULT_XP_RATES): XpGrant[] {
  const densityRate = (density: TheoryDensity | null): number => {
    switch (density) {
      case "dense":
        return rates.theoryStudyPageDense;
      case "light":
        return rates.theoryStudyPageLight;
      default:
        return rates.theoryStudyPageMedium;
    }
  };
  return rows.flatMap((row) => {
    const base = row.entryMode === "pages"
      ? (row.pages ?? 0) * densityRate(row.density)
      : ceilToQuarter((row.wordCount ?? 0) / 250 * rates.theoryStudyPer250Words);
    const xp = base + (row.notesCount ?? 0) * rates.theoryStudyNote;
    return xp > 0
      ? [{
        area: sessionArea(row, "Grammar"),
        feature: "theoryStudy" as const,
        xp,
        at: new Date(row.date),
        dateOnly: row.date,
        sourceId: row.id,
        title: row.title,
        to: "/theory-sessions/$id",
        params: {
          id: row.id,
        },
      }]
      : [];
  });
}

interface PracticePassXpRow {
  id: string;
  text: string;
  passes: PracticePasses | null;
  createdAt: Date;
}

/**
 * Practice-pass XP → Vocabulary (the Start engine's Vocabulary arm points at /practice, so the loop
 * closes here). One grant per completed study pass; a string pass value is the ISO completion
 * timestamp, legacy `true` (or an unparsable string) falls back to the sentence's `createdAt`.
 * Grants share the sentence's `sourceId` so a card's passes merge into one activity item.
 */
export function practicePassXp(rows: PracticePassXpRow[], rates: XpRates = DEFAULT_XP_RATES): XpGrant[] {
  return rows.flatMap((row) => {
    const passes = row.passes ?? {};
    return Object.values(passes).flatMap((value) => {
      if (!value) return [];
      const stamped = typeof value === "string" ? new Date(value) : row.createdAt;
      return [{
        area: "Vocabulary" as const,
        feature: "practice" as const,
        xp: rates.practicePass,
        at: Number.isNaN(stamped.getTime()) ? row.createdAt : stamped,
        sourceId: row.id,
        title: row.text,
        to: "/practice/$id",
        params: {
          id: row.id,
        },
      }];
    });
  });
}

interface CorrectionTriageXpRow {
  id: string;
  original: string;
  triage: Triage | null;
}

/**
 * Correction-triage XP → Writing: working through a correction is where the learning is, so the
 * triage verdict (not the capture) earns the XP, dated by `triage.triagedAt`. Slip-bucket triage
 * deletes the row outright (see triageCorrection), so slips intentionally never earn XP — and, per
 * the derived model, deleting a triaged correction retroactively removes its grant.
 */
export function correctionTriageXp(rows: CorrectionTriageXpRow[], rates: XpRates = DEFAULT_XP_RATES): XpGrant[] {
  return rows.flatMap((row) => {
    if (!row.triage) return [];
    const at = new Date(row.triage.triagedAt);
    if (Number.isNaN(at.getTime())) return [];
    return [{
      area: "Writing" as const,
      feature: "corrections" as const,
      xp: rates.correctionTriaged,
      at,
      sourceId: row.id,
      title: row.original,
      to: "/corrections/log",
    }];
  });
}

/** Round away float noise from fractional rates (0.25/0.5) without hiding quarter points. */
export function roundXp(xp: number): number {
  return Math.round(xp * 100) / 100;
}

/** A timestamp's calendar date (YYYY-MM-DD) in the timezone `offsetMinutes` west of UTC. */
export function localDateString(at: Date, offsetMinutes: number): string {
  // JS getTimezoneOffset() is UTC − local, so subtracting shifts UTC into the caller's local clock.
  return new Date(at.getTime() - offsetMinutes * 60_000).toISOString().slice(0, 10);
}

/**
 * Total XP per learning-day key across all history, for streak counting. Date-only grants (drills,
 * lessons) carry their learner-entered date and bypass the offset, exactly as in `summarizeGrants`.
 */
export function dayXpTotals(grants: XpGrant[], dayOffset: number): Map<string, number> {
  const totals = new Map<string, number>();
  for (const grant of grants) {
    const key = grant.dateOnly ?? localDateString(grant.at, dayOffset);
    totals.set(key, (totals.get(key) ?? 0) + grant.xp);
  }
  return totals;
}

/**
 * Fold a flat grant list into the wire summary: zero-filled areas, a recent-window rollup, and a
 * today total computed against the caller's local calendar day (`tzOffsetMinutes`, as reported by
 * the browser's `getTimezoneOffset()`).
 */
export function summarizeGrants(
  grants: XpGrant[],
  days: number,
  now: Date,
  tzOffsetMinutes = 0,
  dayStartHour = 0,
): XpSummary {
  // A new day starts at `dayStartHour` local — fold it into the offset so work before it (e.g. 1am
  // with a 3am start) lands on the previous calendar date. Date-only sources bypass this (already
  // whole learner-entered dates); the rolling `recent` window is unaffected.
  const dayOffset = tzOffsetMinutes + dayStartHour * 60;
  const areas = new Map<LearningArea, XpAreaSummary>(
    LEARNING_AREAS.map(area => [area, {
      area,
      xp: 0,
      byFeature: {},
      goalBonusXp: 0,
    }]),
  );
  const recentAreas = new Map<LearningArea, number>();
  const todayAreas = new Map<LearningArea, XpAreaSummary>(
    LEARNING_AREAS.map(area => [area, {
      area,
      xp: 0,
      byFeature: {},
      goalBonusXp: 0,
    }]),
  );
  const yesterdayAreas = new Map<LearningArea, XpAreaSummary>(
    LEARNING_AREAS.map(area => [area, {
      area,
      xp: 0,
      byFeature: {},
      goalBonusXp: 0,
    }]),
  );
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  const today = localDateString(now, dayOffset);
  const yesterday = localDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000), dayOffset);

  // Per-area XP for each of the last 14 learning-days (newest first), for the radar's day picker.
  const RADAR_DAY_WINDOW = 14;
  const dayKeys: string[] = [];
  const dayAreaTotals = new Map<string, Map<LearningArea, number>>();
  for (let i = 0; i < RADAR_DAY_WINDOW; i += 1) {
    const key = localDateString(new Date(now.getTime() - i * 86_400_000), dayOffset);
    dayKeys.push(key);
    dayAreaTotals.set(key, new Map());
  }

  for (const grant of grants) {
    const area = areas.get(grant.area);
    if (!area) continue;
    const bonus = grant.goalBonusXp ?? 0;
    area.xp += grant.xp;
    area.byFeature[grant.feature] = (area.byFeature[grant.feature] ?? 0) + grant.xp;
    area.goalBonusXp = (area.goalBonusXp ?? 0) + bonus;
    if (grant.at.getTime() >= cutoff) {
      recentAreas.set(grant.area, (recentAreas.get(grant.area) ?? 0) + grant.xp);
    }
    // Date-only sources (drills, lessons) carry the learner-entered date; compare it directly so a
    // midnight-UTC `at` can't land the grant on the wrong local day.
    const grantDay = grant.dateOnly ?? localDateString(grant.at, dayOffset);
    if (grantDay === today) {
      const todayArea = todayAreas.get(grant.area);
      if (todayArea) {
        todayArea.xp += grant.xp;
        todayArea.byFeature[grant.feature] = (todayArea.byFeature[grant.feature] ?? 0) + grant.xp;
        todayArea.goalBonusXp = (todayArea.goalBonusXp ?? 0) + bonus;
      }
    }
    else if (grantDay === yesterday) {
      const yesterdayArea = yesterdayAreas.get(grant.area);
      if (yesterdayArea) {
        yesterdayArea.xp += grant.xp;
        yesterdayArea.byFeature[grant.feature]
          = (yesterdayArea.byFeature[grant.feature] ?? 0) + grant.xp;
        yesterdayArea.goalBonusXp = (yesterdayArea.goalBonusXp ?? 0) + bonus;
      }
    }
    const dayBucket = dayAreaTotals.get(grantDay);
    if (dayBucket) {
      dayBucket.set(grant.area, (dayBucket.get(grant.area) ?? 0) + grant.xp);
    }
  }

  // The rounded goal-alignment bonus for an area, or undefined when it earned none (keeps payloads lean).
  const bonusOf = (area: XpAreaSummary) => {
    const rounded = roundXp(area.goalBonusXp ?? 0);
    return rounded > 0 ? rounded : undefined;
  };
  const summaries = [...areas.values()].map((area) => {
    const goalBonusXp = bonusOf(area);
    return {
      area: area.area,
      xp: roundXp(area.xp),
      byFeature: Object.fromEntries(
        Object.entries(area.byFeature).map(([feature, xp]) => [feature, roundXp(xp)]),
      ) as XpAreaSummary["byFeature"],
      ...(goalBonusXp !== undefined
        ? {
          goalBonusXp,
        }
        : {}),
    };
  });
  const recent = LEARNING_AREAS
    .filter(area => (recentAreas.get(area) ?? 0) > 0)
    .map(area => ({
      area,
      xp: roundXp(recentAreas.get(area) ?? 0),
    }));
  // Collapse a per-area day bucket to the sparse, rounded shape the wire type uses (areas with no XP dropped).
  const toDayAreas = (bucket: Map<LearningArea, XpAreaSummary>) =>
    [...bucket.values()]
      .filter(area => area.xp > 0)
      .map((area) => {
        const goalBonusXp = bonusOf(area);
        return {
          area: area.area,
          xp: roundXp(area.xp),
          byFeature: Object.fromEntries(
            Object.entries(area.byFeature).map(([feature, xp]) => [feature, roundXp(xp)]),
          ) as XpAreaSummary["byFeature"],
          ...(goalBonusXp !== undefined
            ? {
              goalBonusXp,
            }
            : {}),
        };
      });
  const todayByArea = toDayAreas(todayAreas);
  const yesterdayByArea = toDayAreas(yesterdayAreas);
  const dailyAreas: XpDayAreas[] = dayKeys.map(date => ({
    date,
    areas: [...(dayAreaTotals.get(date) ?? new Map<LearningArea, number>())]
      .filter(([, xp]) => xp > 0)
      .map(([area, xp]) => ({
        area,
        xp: roundXp(xp),
      })),
  }));

  const goalBonusTotal = roundXp(
    [...areas.values()].reduce((sum, area) => sum + (area.goalBonusXp ?? 0), 0),
  );
  return {
    totalXp: roundXp(summaries.reduce((sum, area) => sum + area.xp, 0)),
    ...(goalBonusTotal > 0
      ? {
        goalBonusXp: goalBonusTotal,
      }
      : {}),
    areas: summaries,
    recent: {
      days,
      totalXp: roundXp(recent.reduce((sum, area) => sum + area.xp, 0)),
      areas: recent,
    },
    today: {
      totalXp: roundXp(todayByArea.reduce((sum, area) => sum + area.xp, 0)),
      areas: todayByArea,
    },
    yesterday: {
      totalXp: roundXp(yesterdayByArea.reduce((sum, area) => sum + area.xp, 0)),
      areas: yesterdayByArea,
    },
    dailyAreas,
    streak: null,
  };
}

/**
 * Load every XP grant from the database (narrow selects; all rules live in the per-feature functions
 * above), using the effective rates (defaults merged with any Settings-page overrides) so a rate
 * change retroactively re-scores everything on the next fetch. Shared by the summary and the activity
 * feed so their numbers can never diverge.
 */
export async function loadXpGrants(): Promise<XpGrant[]> {
  const [
    rates,
    profile,
    readingRows,
    writingRows,
    mySentenceRows,
    sheetRows,
    answerRows,
    listeningRows,
    shadowingRows,
    dialogueRows,
    drillRows,
    lessonRows,
    theoryRows,
    practiceRows,
    correctionRows,
  ] = await Promise.all([
    getXpRates(),
    getLearnerProfile(),
    db.select({
      id: readingSessions.id,
      title: readingSessions.title,
      mode: readingSessions.mode,
      difficulty: readingSessions.difficulty,
      passive: readingSessions.passive,
      timeSpentMinutes: readingSessions.timeSpentMinutes,
      freeformTranslation: readingSessions.freeformTranslation,
      freeformCorrection: readingSessions.freeformCorrection,
      freeformNote: readingSessions.freeformNote,
      freeformVerdict: readingSessions.freeformVerdict,
      lines: readingSessions.lines,
      wordNotes: readingSessions.wordNotes,
      date: readingSessions.date,
      learningArea: readingSessions.learningArea,
      countsTowardXp: readingSessions.countsTowardXp,
      createdAt: readingSessions.createdAt,
    }).from(readingSessions),
    db.select({
      id: writings.id,
      text: writings.text,
      corrections: writings.corrections,
      date: writings.date,
      createdAt: writings.createdAt,
    }).from(writings),
    db.select({
      id: mySentences.id,
      writingId: mySentences.writingId,
      correction: mySentences.correction,
      createdAt: mySentences.createdAt,
    }).from(mySentences),
    db.select({
      id: questionSheets.id,
      title: questionSheets.title,
      layout: questionSheets.layout,
      learningAreas: questionSheets.learningAreas,
      createdAt: questionSheets.createdAt,
    }).from(questionSheets),
    db.select({
      id: answerSheets.id,
      title: answerSheets.title,
      questionSheetId: answerSheets.questionSheetId,
      entries: answerSheets.entries,
      date: answerSheets.date,
      createdAt: answerSheets.createdAt,
      updatedAt: answerSheets.updatedAt,
    }).from(answerSheets),
    db.select({
      id: listeningSessions.id,
      title: listeningSessions.title,
      entries: listeningSessions.entries,
      passive: listeningSessions.passive,
      durationMinutes: listeningSessions.durationMinutes,
      date: listeningSessions.date,
      learningArea: listeningSessions.learningArea,
      countsTowardXp: listeningSessions.countsTowardXp,
      createdAt: listeningSessions.createdAt,
    }).from(listeningSessions),
    db.select({
      id: shadowingSessions.id,
      title: shadowingSessions.title,
      completedLoops: shadowingSessions.completedLoops,
      date: shadowingSessions.date,
      learningArea: shadowingSessions.learningArea,
      countsTowardXp: shadowingSessions.countsTowardXp,
      createdAt: shadowingSessions.createdAt,
    }).from(shadowingSessions),
    db.select({
      id: dialogues.id,
      title: dialogues.title,
      date: dialogues.date,
      lines: dialogues.lines,
      countsTowardXp: dialogues.countsTowardXp,
      learningArea: dialogues.learningArea,
    }).from(dialogues),
    db.select({
      id: drillSessions.id,
      title: drillSessions.title,
      date: drillSessions.date,
      questions: drillSessions.questions,
      type: drillSessions.type,
      learningArea: drillSessions.learningArea,
      mistakes: drillSessions.mistakes,
    }).from(drillSessions),
    db.select({
      id: lessons.id,
      title: lessons.title,
      date: lessons.date,
      listeningNotes: lessons.listeningNotes,
      wordNotes: lessons.wordNotes,
      durationMinutes: lessons.durationMinutes,
      learningArea: lessons.learningArea,
      countsTowardXp: lessons.countsTowardXp,
    }).from(lessons),
    db.select({
      id: theorySessions.id,
      title: theorySessions.title,
      date: theorySessions.date,
      entryMode: theorySessions.entryMode,
      pages: theorySessions.pages,
      density: theorySessions.density,
      wordCount: theorySessions.wordCount,
      notesCount: theorySessions.notesCount,
      learningArea: theorySessions.learningArea,
    }).from(theorySessions),
    db.select({
      id: practiceSentences.id,
      text: practiceSentences.text,
      passes: practiceSentences.passes,
      createdAt: practiceSentences.createdAt,
    }).from(practiceSentences),
    db.select({
      id: corrections.id,
      original: corrections.original,
      triage: corrections.triage,
    }).from(corrections),
  ]);

  const grants = [
    ...readingXp(readingRows, rates),
    ...writingXp(writingRows, mySentenceRows, rates),
    ...bookExercisesXp(sheetRows as QuestionSheetXpRow[], answerRows, rates),
    ...listeningXp(listeningRows, rates),
    ...shadowingXp(shadowingRows, rates),
    ...dialoguesXp(dialogueRows, rates),
    ...drillXp(drillRows, rates),
    ...lessonXp(lessonRows, rates),
    ...theoryStudyXp(theoryRows, rates),
    ...practicePassXp(practiceRows, rates),
    ...correctionTriageXp(correctionRows, rates),
  ];
  return applyGoalBonus(grants, profile.goals);
}

/**
 * Compute the full XP summary from the database, using the effective rates (defaults merged with any
 * Settings-page overrides) so a rate change retroactively re-scores everything on the next fetch.
 */
export async function getXpSummary(days: number, tzOffsetMinutes = 0): Promise<XpSummary> {
  const [grants, profile] = await Promise.all([loadXpGrants(), getLearnerProfile()]);
  const now = new Date();
  const summary = summarizeGrants(grants, days, now, tzOffsetMinutes, profile.dayStartHour);
  if (profile.dailyXpGoal && profile.dailyXpGoal > 0) {
    const dayOffset = tzOffsetMinutes + profile.dayStartHour * 60;
    summary.streak = computeStreak(
      dayXpTotals(grants, dayOffset),
      profile.dailyXpGoal,
      localDateString(now, dayOffset),
    );
  }
  return summary;
}

import type {
  AnswerSheetEntry,
  LearningArea,
  LessonListeningNote,
  LessonWordNote,
  ListeningEntry,
  QuestionSheetLayout,
  ReadingLine,
  WordNote,
  WritingCorrection,
  XpAreaSummary,
  XpFeature,
  XpSummary,
} from "@sentence-bank/types";
import { LEARNING_AREAS } from "@sentence-bank/types";
import { db } from "@/db";
import {
  answerSheets,
  drillSessions,
  lessons,
  listeningSessions,
  mySentences,
  questionSheets,
  readingSessions,
  shadowingSessions,
  writings,
} from "@/db/schema";

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
}

/** XP rates, in one place so the rules read like the spec. */
export const XP_RATES = {
  readingTranslatedSentence: 2,
  readingWordNote: 1,
  writingSentence: 1,
  writingCorrection: 1,
  questionSheetAuthored: 5,
  answerEntryList: 2,
  answerEntryGrid: 0.25,
  listeningEntry: 1,
  shadowingLoop: 0.25,
  drillRound: 0.25,
  lessonLine: 1,
  lessonWordNote: 0.5,
} as const;

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

/** Attribute `xp` to a sheet's learning areas, split evenly; sheets with none fall back to Grammar. */
function splitAcrossAreas(
  areas: LearningArea[] | null,
  feature: XpFeature,
  xp: number,
  at: Date,
): XpGrant[] {
  const targets = areas && areas.length > 0 ? areas : ["Grammar" as const];
  return targets.map(area => ({
    area,
    feature,
    xp: xp / targets.length,
    at,
  }));
}

interface ReadingXpRow {
  mode: string;
  freeformTranslation: string | null;
  lines: ReadingLine[] | null;
  wordNotes: WordNote[] | null;
  createdAt: Date;
}

/** 2xp per translated sentence + 1xp per word note → Reading. */
export function readingXp(rows: ReadingXpRow[]): XpGrant[] {
  return rows.flatMap((row) => {
    const translated = row.mode === "line-by-line"
      ? (row.lines ?? []).filter(line => line.translation?.trim()).length
      : countSentences(row.freeformTranslation);
    const xp = translated * XP_RATES.readingTranslatedSentence
      + (row.wordNotes?.length ?? 0) * XP_RATES.readingWordNote;
    return xp > 0
      ? [{
        area: "Reading" as const,
        feature: "reading" as const,
        xp,
        at: row.createdAt,
      }]
      : [];
  });
}

interface WritingXpRow {
  text: string;
  corrections: WritingCorrection[] | null;
  createdAt: Date;
}

interface MySentenceXpRow {
  writingId: string | null;
  correction: string | null;
  createdAt: Date;
}

/**
 * 1xp per sentence written + 1xp per correction → Writing. My Sentences promoted from a writing
 * (`writingId` set) are skipped: their sentence and correction were already counted on the writing.
 */
export function writingXp(rows: WritingXpRow[], sentences: MySentenceXpRow[]): XpGrant[] {
  const fromWritings = rows.flatMap((row) => {
    const xp = countSentences(row.text) * XP_RATES.writingSentence
      + (row.corrections?.length ?? 0) * XP_RATES.writingCorrection;
    return xp > 0
      ? [{
        area: "Writing" as const,
        feature: "writing" as const,
        xp,
        at: row.createdAt,
      }]
      : [];
  });
  const fromSentences = sentences
    .filter(row => row.writingId == null)
    .map(row => ({
      area: "Writing" as const,
      feature: "writing" as const,
      xp: XP_RATES.writingSentence + (row.correction ? XP_RATES.writingCorrection : 0),
      at: row.createdAt,
    }));
  return [...fromWritings, ...fromSentences];
}

interface QuestionSheetXpRow {
  id: string;
  layout: string;
  learningAreas: LearningArea[] | null;
  createdAt: Date;
}

interface AnswerSheetXpRow {
  questionSheetId: string;
  entries: AnswerSheetEntry[] | null;
  createdAt: Date;
}

/**
 * 5xp per authored sheet; 2xp per answered entry (0.25xp on grid/table sheets) → the sheet's own
 * learning areas. Answer sheets whose sheet no longer exists fall back to Grammar at the list rate.
 */
export function bookExercisesXp(
  sheets: QuestionSheetXpRow[],
  answers: AnswerSheetXpRow[],
): XpGrant[] {
  const byId = new Map(sheets.map(sheet => [sheet.id, sheet]));
  const authored = sheets.flatMap(sheet => splitAcrossAreas(
    sheet.learningAreas,
    "bookExercises",
    XP_RATES.questionSheetAuthored,
    sheet.createdAt,
  ));
  const answered = answers.flatMap((answer) => {
    const entryCount = answer.entries?.length ?? 0;
    if (entryCount === 0) return [];
    const sheet = byId.get(answer.questionSheetId);
    const rate = (sheet?.layout as QuestionSheetLayout) === "grid"
      ? XP_RATES.answerEntryGrid
      : XP_RATES.answerEntryList;
    return splitAcrossAreas(
      sheet?.learningAreas ?? null,
      "bookExercises",
      entryCount * rate,
      answer.createdAt,
    );
  });
  return [...authored, ...answered];
}

interface ListeningXpRow {
  entries: ListeningEntry[] | null;
  createdAt: Date;
}

/** 1xp per typed entry → Listening. */
export function listeningXp(rows: ListeningXpRow[]): XpGrant[] {
  return rows.flatMap(row => (row.entries?.length
    ? [{
      area: "Listening" as const,
      feature: "listening" as const,
      xp: row.entries.length * XP_RATES.listeningEntry,
      at: row.createdAt,
    }]
    : []));
}

interface ShadowingXpRow {
  completedLoops: number;
  createdAt: Date;
}

/** 0.25xp per completed segment loop → Speaking. */
export function shadowingXp(rows: ShadowingXpRow[]): XpGrant[] {
  return rows.flatMap(row => (row.completedLoops > 0
    ? [{
      area: "Speaking" as const,
      feature: "shadowing" as const,
      xp: row.completedLoops * XP_RATES.shadowingLoop,
      at: row.createdAt,
    }]
    : []));
}

interface DrillXpRow {
  date: string;
  rounds: number;
  learningArea: LearningArea | null;
}

/** 0.25xp per round → the session's chosen area, defaulting to Grammar. */
export function drillXp(rows: DrillXpRow[]): XpGrant[] {
  return rows.flatMap(row => (row.rounds > 0
    ? [{
      area: row.learningArea ?? ("Grammar" as const),
      feature: "drills" as const,
      xp: row.rounds * XP_RATES.drillRound,
      at: new Date(row.date),
    }]
    : []));
}

interface LessonXpRow {
  date: string;
  listeningNotes: LessonListeningNote[] | null;
  wordNotes: LessonWordNote[] | null;
}

/** 1xp per line → Listening; 0.5xp per fully-filled word note → Vocabulary. */
export function lessonXp(rows: LessonXpRow[]): XpGrant[] {
  return rows.flatMap((row) => {
    const at = new Date(row.date);
    const grants: XpGrant[] = [];
    const lines = row.listeningNotes?.length ?? 0;
    if (lines > 0) {
      grants.push({
        area: "Listening",
        feature: "lessons",
        xp: lines * XP_RATES.lessonLine,
        at,
      });
    }
    const filled = (row.wordNotes ?? []).filter(isFilledWordNote).length;
    if (filled > 0) {
      grants.push({
        area: "Vocabulary",
        feature: "lessons",
        xp: filled * XP_RATES.lessonWordNote,
        at,
      });
    }
    return grants;
  });
}

/** Round away float noise from fractional rates (0.25/0.5) without hiding quarter points. */
function roundXp(xp: number): number {
  return Math.round(xp * 100) / 100;
}

/** Fold a flat grant list into the wire summary: zero-filled areas + a recent-window rollup. */
export function summarizeGrants(grants: XpGrant[], days: number, now: Date): XpSummary {
  const areas = new Map<LearningArea, XpAreaSummary>(
    LEARNING_AREAS.map(area => [area, {
      area,
      xp: 0,
      byFeature: {},
    }]),
  );
  const recentAreas = new Map<LearningArea, number>();
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;

  for (const grant of grants) {
    const area = areas.get(grant.area);
    if (!area) continue;
    area.xp += grant.xp;
    area.byFeature[grant.feature] = (area.byFeature[grant.feature] ?? 0) + grant.xp;
    if (grant.at.getTime() >= cutoff) {
      recentAreas.set(grant.area, (recentAreas.get(grant.area) ?? 0) + grant.xp);
    }
  }

  const summaries = [...areas.values()].map(area => ({
    area: area.area,
    xp: roundXp(area.xp),
    byFeature: Object.fromEntries(
      Object.entries(area.byFeature).map(([feature, xp]) => [feature, roundXp(xp)]),
    ) as XpAreaSummary["byFeature"],
  }));
  const recent = LEARNING_AREAS
    .filter(area => (recentAreas.get(area) ?? 0) > 0)
    .map(area => ({
      area,
      xp: roundXp(recentAreas.get(area) ?? 0),
    }));

  return {
    totalXp: roundXp(summaries.reduce((sum, area) => sum + area.xp, 0)),
    areas: summaries,
    recent: {
      days,
      totalXp: roundXp(recent.reduce((sum, area) => sum + area.xp, 0)),
      areas: recent,
    },
  };
}

/** Compute the full XP summary from the database (narrow selects; all rules live above). */
export async function getXpSummary(days: number): Promise<XpSummary> {
  const [
    readingRows,
    writingRows,
    mySentenceRows,
    sheetRows,
    answerRows,
    listeningRows,
    shadowingRows,
    drillRows,
    lessonRows,
  ] = await Promise.all([
    db.select({
      mode: readingSessions.mode,
      freeformTranslation: readingSessions.freeformTranslation,
      lines: readingSessions.lines,
      wordNotes: readingSessions.wordNotes,
      createdAt: readingSessions.createdAt,
    }).from(readingSessions),
    db.select({
      text: writings.text,
      corrections: writings.corrections,
      createdAt: writings.createdAt,
    }).from(writings),
    db.select({
      writingId: mySentences.writingId,
      correction: mySentences.correction,
      createdAt: mySentences.createdAt,
    }).from(mySentences),
    db.select({
      id: questionSheets.id,
      layout: questionSheets.layout,
      learningAreas: questionSheets.learningAreas,
      createdAt: questionSheets.createdAt,
    }).from(questionSheets),
    db.select({
      questionSheetId: answerSheets.questionSheetId,
      entries: answerSheets.entries,
      createdAt: answerSheets.createdAt,
    }).from(answerSheets),
    db.select({
      entries: listeningSessions.entries,
      createdAt: listeningSessions.createdAt,
    }).from(listeningSessions),
    db.select({
      completedLoops: shadowingSessions.completedLoops,
      createdAt: shadowingSessions.createdAt,
    }).from(shadowingSessions),
    db.select({
      date: drillSessions.date,
      rounds: drillSessions.rounds,
      learningArea: drillSessions.learningArea,
    }).from(drillSessions),
    db.select({
      date: lessons.date,
      listeningNotes: lessons.listeningNotes,
      wordNotes: lessons.wordNotes,
    }).from(lessons),
  ]);

  const grants = [
    ...readingXp(readingRows),
    ...writingXp(writingRows, mySentenceRows),
    ...bookExercisesXp(sheetRows as QuestionSheetXpRow[], answerRows),
    ...listeningXp(listeningRows),
    ...shadowingXp(shadowingRows),
    ...drillXp(drillRows),
    ...lessonXp(lessonRows),
  ];
  return summarizeGrants(grants, days, new Date());
}

import type {
  AnswerSheetEntry,
  LearningArea,
  LessonListeningNote,
  LessonWordNote,
  ListeningEntry,
  QuestionSheetLayout,
  ReadingLine,
  TheoryDensity,
  TheoryEntryMode,
  WordNote,
  WritingCorrection,
  XpAreaSummary,
  XpFeature,
  XpRates,
  XpSummary,
} from "@sentence-bank/types";
import { DEFAULT_XP_RATES, LEARNING_AREAS } from "@sentence-bank/types";
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
  theorySessions,
  writings,
} from "@/db/schema";
import { getXpRates } from "@/services/settings";

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

/** Attribute `xp` to a sheet's learning areas, split evenly; sheets with none fall back to Grammar. */
function splitAcrossAreas(
  areas: LearningArea[] | null,
  feature: XpFeature,
  xp: number,
  at: Date,
  meta?: Pick<XpGrant, "sourceId" | "title" | "to" | "params">,
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
  freeformTranslation: string | null;
  lines: ReadingLine[] | null;
  wordNotes: WordNote[] | null;
  date: string;
  createdAt: Date;
}

/** 2xp per translated sentence + 1xp per word note → Reading. */
export function readingXp(rows: ReadingXpRow[], rates: XpRates = DEFAULT_XP_RATES): XpGrant[] {
  return rows.flatMap((row) => {
    const translated = row.mode === "line-by-line"
      ? (row.lines ?? []).filter(line => line.translation?.trim()).length
      : countSentences(row.freeformTranslation);
    const xp = translated * rates.readingTranslatedSentence
      + (row.wordNotes?.length ?? 0) * rates.readingWordNote;
    return xp > 0
      ? [{
        area: "Reading" as const,
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
  createdAt: Date;
}

/**
 * 5xp per authored sheet; 2xp per answered entry (0.25xp on grid/table sheets) → the sheet's own
 * learning areas. Answer sheets whose sheet no longer exists fall back to Grammar at the list rate.
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
    return splitAcrossAreas(
      sheet?.learningAreas ?? null,
      "bookExercises",
      entryCount * rate,
      answer.createdAt,
      {
        sourceId: answer.id,
        title: answer.title ?? sheet?.title ?? null,
        to: "/answer-sheets/$id",
        params: {
          id: answer.id,
        },
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
}

/**
 * Listening XP → Listening. A passive session (just listening, no notes) earns per minute of its
 * duration; a normal session earns per typed note. A session is one or the other.
 */
export function listeningXp(rows: ListeningXpRow[], rates: XpRates = DEFAULT_XP_RATES): XpGrant[] {
  return rows.flatMap((row) => {
    const xp = row.passive
      ? row.durationMinutes * rates.listeningPassiveMinute
      : (row.entries?.length ?? 0) * rates.listeningEntry;
    return xp > 0
      ? [{
        area: "Listening" as const,
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
}

/** 0.25xp per completed segment loop → Speaking. */
export function shadowingXp(rows: ShadowingXpRow[], rates: XpRates = DEFAULT_XP_RATES): XpGrant[] {
  return rows.flatMap(row => (row.completedLoops > 0
    ? [{
      area: "Speaking" as const,
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

interface DrillXpRow {
  id: string;
  title: string | null;
  date: string;
  questions: number;
  learningArea: LearningArea | null;
}

/** 0.25xp per question → the session's chosen area, defaulting to Grammar. */
export function drillXp(rows: DrillXpRow[], rates: XpRates = DEFAULT_XP_RATES): XpGrant[] {
  return rows.flatMap(row => (row.questions > 0
    ? [{
      area: row.learningArea ?? ("Grammar" as const),
      feature: "drills" as const,
      xp: row.questions * rates.drillQuestion,
      at: new Date(row.date),
      dateOnly: row.date,
      sourceId: row.id,
      title: row.title,
      to: "/drill-sessions/$id",
      params: {
        id: row.id,
      },
    }]
    : []));
}

interface LessonXpRow {
  id: string;
  title: string | null;
  date: string;
  listeningNotes: LessonListeningNote[] | null;
  wordNotes: LessonWordNote[] | null;
}

/** 1xp per line → Listening; 0.5xp per fully-filled word note → Vocabulary. */
export function lessonXp(rows: LessonXpRow[], rates: XpRates = DEFAULT_XP_RATES): XpGrant[] {
  return rows.flatMap((row) => {
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
        area: row.learningArea ?? ("Grammar" as const),
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

/** Round away float noise from fractional rates (0.25/0.5) without hiding quarter points. */
function roundXp(xp: number): number {
  return Math.round(xp * 100) / 100;
}

/** A timestamp's calendar date (YYYY-MM-DD) in the timezone `offsetMinutes` west of UTC. */
export function localDateString(at: Date, offsetMinutes: number): string {
  // JS getTimezoneOffset() is UTC − local, so subtracting shifts UTC into the caller's local clock.
  return new Date(at.getTime() - offsetMinutes * 60_000).toISOString().slice(0, 10);
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
): XpSummary {
  const areas = new Map<LearningArea, XpAreaSummary>(
    LEARNING_AREAS.map(area => [area, {
      area,
      xp: 0,
      byFeature: {},
    }]),
  );
  const recentAreas = new Map<LearningArea, number>();
  const todayAreas = new Map<LearningArea, XpAreaSummary>(
    LEARNING_AREAS.map(area => [area, {
      area,
      xp: 0,
      byFeature: {},
    }]),
  );
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  const today = localDateString(now, tzOffsetMinutes);

  for (const grant of grants) {
    const area = areas.get(grant.area);
    if (!area) continue;
    area.xp += grant.xp;
    area.byFeature[grant.feature] = (area.byFeature[grant.feature] ?? 0) + grant.xp;
    if (grant.at.getTime() >= cutoff) {
      recentAreas.set(grant.area, (recentAreas.get(grant.area) ?? 0) + grant.xp);
    }
    // Date-only sources (drills, lessons) carry the learner-entered date; compare it directly so a
    // midnight-UTC `at` can't land the grant on the wrong local day.
    const grantDay = grant.dateOnly ?? localDateString(grant.at, tzOffsetMinutes);
    if (grantDay === today) {
      const todayArea = todayAreas.get(grant.area);
      if (todayArea) {
        todayArea.xp += grant.xp;
        todayArea.byFeature[grant.feature] = (todayArea.byFeature[grant.feature] ?? 0) + grant.xp;
      }
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
  const todayByArea = [...todayAreas.values()]
    .filter(area => area.xp > 0)
    .map(area => ({
      area: area.area,
      xp: roundXp(area.xp),
      byFeature: Object.fromEntries(
        Object.entries(area.byFeature).map(([feature, xp]) => [feature, roundXp(xp)]),
      ) as XpAreaSummary["byFeature"],
    }));

  return {
    totalXp: roundXp(summaries.reduce((sum, area) => sum + area.xp, 0)),
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
    readingRows,
    writingRows,
    mySentenceRows,
    sheetRows,
    answerRows,
    listeningRows,
    shadowingRows,
    drillRows,
    lessonRows,
    theoryRows,
  ] = await Promise.all([
    getXpRates(),
    db.select({
      id: readingSessions.id,
      title: readingSessions.title,
      mode: readingSessions.mode,
      freeformTranslation: readingSessions.freeformTranslation,
      lines: readingSessions.lines,
      wordNotes: readingSessions.wordNotes,
      date: readingSessions.date,
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
      createdAt: answerSheets.createdAt,
    }).from(answerSheets),
    db.select({
      id: listeningSessions.id,
      title: listeningSessions.title,
      entries: listeningSessions.entries,
      passive: listeningSessions.passive,
      durationMinutes: listeningSessions.durationMinutes,
      date: listeningSessions.date,
      createdAt: listeningSessions.createdAt,
    }).from(listeningSessions),
    db.select({
      id: shadowingSessions.id,
      title: shadowingSessions.title,
      completedLoops: shadowingSessions.completedLoops,
      date: shadowingSessions.date,
      createdAt: shadowingSessions.createdAt,
    }).from(shadowingSessions),
    db.select({
      id: drillSessions.id,
      title: drillSessions.title,
      date: drillSessions.date,
      questions: drillSessions.questions,
      learningArea: drillSessions.learningArea,
    }).from(drillSessions),
    db.select({
      id: lessons.id,
      title: lessons.title,
      date: lessons.date,
      listeningNotes: lessons.listeningNotes,
      wordNotes: lessons.wordNotes,
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
  ]);

  return [
    ...readingXp(readingRows, rates),
    ...writingXp(writingRows, mySentenceRows, rates),
    ...bookExercisesXp(sheetRows as QuestionSheetXpRow[], answerRows, rates),
    ...listeningXp(listeningRows, rates),
    ...shadowingXp(shadowingRows, rates),
    ...drillXp(drillRows, rates),
    ...lessonXp(lessonRows, rates),
    ...theoryStudyXp(theoryRows, rates),
  ];
}

/**
 * Compute the full XP summary from the database, using the effective rates (defaults merged with any
 * Settings-page overrides) so a rate change retroactively re-scores everything on the next fetch.
 */
export async function getXpSummary(days: number, tzOffsetMinutes = 0): Promise<XpSummary> {
  const grants = await loadXpGrants();
  return summarizeGrants(grants, days, new Date(), tzOffsetMinutes);
}

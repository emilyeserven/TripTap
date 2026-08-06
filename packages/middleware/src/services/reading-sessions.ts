import { desc } from "drizzle-orm";
import type {
  CreateReadingSessionInput,
  ReadingSession,
  ReadingTranslationMode,
} from "@sentence-bank/types";
import { readingSessions, type ReadingSessionRow } from "@/db/schema";
import { crudService } from "@/services/crud";
import { toIso } from "@/services/rows";

/** Coalesce a possibly-null stored mode to the default. */
function toMode(mode: string | null): ReadingTranslationMode {
  return mode === "line-by-line" || mode === "summary" ? mode : "freeform";
}

/** Map a DB row to the shared `ReadingSession` wire type. */
function toReadingSession(row: ReadingSessionRow): ReadingSession {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    language: row.language,
    sourceId: row.sourceId,
    page: row.page,
    mode: toMode(row.mode),
    difficulty: row.difficulty as ReadingSession["difficulty"],
    passive: row.passive,
    timeSpentMinutes: row.timeSpentMinutes,
    passage: row.passage,
    freeformTranslation: row.freeformTranslation,
    freeformCorrection: row.freeformCorrection,
    freeformNote: row.freeformNote,
    freeformVerdict: row.freeformVerdict as ReadingSession["freeformVerdict"],
    summary: row.summary,
    lines: row.lines ?? null,
    wordNotes: row.wordNotes ?? null,
    bookmarkId: row.bookmarkId ?? null,
    bookmarkTitle: row.bookmarkTitle ?? null,
    bookmarkUrl: row.bookmarkUrl ?? null,
    section: row.section ?? null,
    learningArea: row.learningArea ?? null,
    countsTowardXp: row.countsTowardXp,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** Drizzle insert shape for one reading-session row, from the create input. */
function toInsert(input: CreateReadingSessionInput) {
  return {
    date: input.date,
    title: input.title,
    language: input.language,
    sourceId: input.sourceId ?? null,
    page: input.page ?? null,
    mode: input.mode ?? "freeform",
    difficulty: input.difficulty ?? null,
    passive: input.passive ?? false,
    timeSpentMinutes: input.timeSpentMinutes ?? 0,
    passage: input.passage ?? null,
    freeformTranslation: input.freeformTranslation ?? null,
    freeformCorrection: input.freeformCorrection ?? null,
    freeformNote: input.freeformNote ?? null,
    freeformVerdict: input.freeformVerdict ?? null,
    summary: input.summary ?? null,
    lines: input.lines ?? null,
    wordNotes: input.wordNotes ?? null,
    bookmarkId: input.bookmarkId ?? null,
    bookmarkTitle: input.bookmarkTitle ?? null,
    bookmarkUrl: input.bookmarkUrl ?? null,
    section: input.section ?? null,
    learningArea: input.learningArea ?? null,
    countsTowardXp: input.countsTowardXp ?? true,
  };
}

const crud = crudService(readingSessions, {
  toWire: toReadingSession,
  toInsert,
  orderBy: [desc(readingSessions.date), desc(readingSessions.createdAt)],
});

/** List reading sessions, most recent date first. */
export const listReadingSessions = crud.list;
export const getReadingSession = crud.get;
export const createReadingSession = crud.create;
export const updateReadingSession = crud.update;
export const deleteReadingSession = crud.remove;

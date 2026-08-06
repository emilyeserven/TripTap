import { desc, eq } from "drizzle-orm";
import type {
  CreateLessonInput,
  Lesson,
} from "@sentence-bank/types";
import { lessons, type LessonRow } from "@/db/schema";
import { crudService } from "@/services/crud";
import { toIso } from "@/services/rows";

/** Map a DB row to the shared `Lesson` wire type. */
function toLesson(row: LessonRow): Lesson {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    language: row.language,
    tutorId: row.tutorId,
    notes: row.notes,
    listeningNotes: row.listeningNotes ?? null,
    wordNotes: row.wordNotes ?? null,
    answerSheetIds: row.answerSheetIds ?? null,
    durationMinutes: row.durationMinutes,
    learningArea: row.learningArea ?? null,
    countsTowardXp: row.countsTowardXp,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** Drizzle insert shape for one lesson row, from the create input. */
function toInsert(input: CreateLessonInput) {
  return {
    title: input.title ?? null,
    date: input.date,
    language: input.language ?? "Japanese",
    tutorId: input.tutorId ?? null,
    notes: input.notes ?? null,
    listeningNotes: input.listeningNotes ?? null,
    wordNotes: input.wordNotes ?? null,
    answerSheetIds: input.answerSheetIds ?? null,
    durationMinutes: input.durationMinutes ?? 0,
    learningArea: input.learningArea ?? null,
    countsTowardXp: input.countsTowardXp ?? true,
  };
}

const crud = crudService(lessons, {
  toWire: toLesson,
  toInsert,
  orderBy: [desc(lessons.date), desc(lessons.createdAt)],
});

/** List lessons, most recent date first; optionally scoped to one tutor. */
export function listLessons(tutorId?: string): Promise<Lesson[]> {
  return crud.list(tutorId ? eq(lessons.tutorId, tutorId) : undefined);
}

export const getLesson = crud.get;
export const createLesson = crud.create;
export const updateLesson = crud.update;
export const deleteLesson = crud.remove;

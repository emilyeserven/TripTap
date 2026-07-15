import { desc, eq } from "drizzle-orm";
import type {
  CreateLessonInput,
  Lesson,
  UpdateLessonInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { lessons, type LessonRow } from "@/db/schema";

/** Map a DB row to the shared `Lesson` wire type. */
export function toLesson(row: LessonRow): Lesson {
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
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
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
  };
}

/** List lessons, most recent date first; optionally scoped to one tutor. */
export async function listLessons(tutorId?: string): Promise<Lesson[]> {
  const rows = tutorId
    ? await db
      .select()
      .from(lessons)
      .where(eq(lessons.tutorId, tutorId))
      .orderBy(desc(lessons.date), desc(lessons.createdAt))
    : await db.select().from(lessons).orderBy(desc(lessons.date), desc(lessons.createdAt));
  return rows.map(toLesson);
}

export async function getLesson(id: string): Promise<Lesson | null> {
  const [row] = await db.select().from(lessons).where(eq(lessons.id, id));
  return row ? toLesson(row) : null;
}

export async function createLesson(input: CreateLessonInput): Promise<Lesson> {
  const [row] = await db.insert(lessons).values(toInsert(input)).returning();
  return toLesson(row);
}

export async function updateLesson(
  id: string,
  input: UpdateLessonInput,
): Promise<Lesson | null> {
  const [row] = await db
    .update(lessons)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(lessons.id, id))
    .returning();
  return row ? toLesson(row) : null;
}

export async function deleteLesson(id: string): Promise<boolean> {
  const rows = await db.delete(lessons).where(eq(lessons.id, id)).returning({
    id: lessons.id,
  });
  return rows.length > 0;
}

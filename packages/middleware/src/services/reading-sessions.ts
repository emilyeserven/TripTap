import { desc, eq } from "drizzle-orm";
import type {
  CreateReadingSessionInput,
  ReadingSession,
  ReadingTranslationMode,
  UpdateReadingSessionInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { readingSessions, type ReadingSessionRow } from "@/db/schema";

/** Coalesce a possibly-null stored mode to the default. */
function toMode(mode: string | null): ReadingTranslationMode {
  return mode === "line-by-line" ? "line-by-line" : "freeform";
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
    passage: row.passage,
    freeformTranslation: row.freeformTranslation,
    summary: row.summary,
    lines: row.lines ?? null,
    wordNotes: row.wordNotes ?? null,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
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
    passage: input.passage ?? null,
    freeformTranslation: input.freeformTranslation ?? null,
    summary: input.summary ?? null,
    lines: input.lines ?? null,
    wordNotes: input.wordNotes ?? null,
  };
}

/** List reading sessions, most recent date first. */
export async function listReadingSessions(): Promise<ReadingSession[]> {
  const rows = await db
    .select()
    .from(readingSessions)
    .orderBy(desc(readingSessions.date), desc(readingSessions.createdAt));
  return rows.map(toReadingSession);
}

export async function getReadingSession(id: string): Promise<ReadingSession | null> {
  const [row] = await db.select().from(readingSessions).where(eq(readingSessions.id, id));
  return row ? toReadingSession(row) : null;
}

export async function createReadingSession(
  input: CreateReadingSessionInput,
): Promise<ReadingSession> {
  const [row] = await db.insert(readingSessions).values(toInsert(input)).returning();
  return toReadingSession(row);
}

export async function updateReadingSession(
  id: string,
  input: UpdateReadingSessionInput,
): Promise<ReadingSession | null> {
  const [row] = await db
    .update(readingSessions)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(readingSessions.id, id))
    .returning();
  return row ? toReadingSession(row) : null;
}

export async function deleteReadingSession(id: string): Promise<boolean> {
  const rows = await db.delete(readingSessions).where(eq(readingSessions.id, id)).returning({
    id: readingSessions.id,
  });
  return rows.length > 0;
}

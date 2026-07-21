import { desc, eq } from "drizzle-orm";
import type {
  CreateTheorySessionInput,
  TheorySession,
  UpdateTheorySessionInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { theorySessions, type TheorySessionRow } from "@/db/schema";

/** Map a DB row to the shared `TheorySession` wire type. */
function toTheorySession(row: TheorySessionRow): TheorySession {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    entryMode: row.entryMode,
    pages: row.pages ?? null,
    density: row.density ?? null,
    wordCount: row.wordCount ?? null,
    notesCount: row.notesCount,
    notes: row.notes ?? null,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

/** Drizzle insert shape for one theory-session row, from the create input. */
function toInsert(input: CreateTheorySessionInput) {
  return {
    date: input.date,
    title: input.title ?? null,
    entryMode: input.entryMode,
    pages: input.pages ?? null,
    density: input.density ?? null,
    wordCount: input.wordCount ?? null,
    notesCount: input.notesCount ?? 0,
    notes: input.notes ?? null,
  };
}

/** List theory sessions, most recent date first. */
export async function listTheorySessions(): Promise<TheorySession[]> {
  const rows = await db
    .select()
    .from(theorySessions)
    .orderBy(desc(theorySessions.date), desc(theorySessions.createdAt));
  return rows.map(toTheorySession);
}

export async function getTheorySession(id: string): Promise<TheorySession | null> {
  const [row] = await db.select().from(theorySessions).where(eq(theorySessions.id, id));
  return row ? toTheorySession(row) : null;
}

export async function createTheorySession(input: CreateTheorySessionInput): Promise<TheorySession> {
  const [row] = await db.insert(theorySessions).values(toInsert(input)).returning();
  return toTheorySession(row);
}

export async function updateTheorySession(
  id: string,
  input: UpdateTheorySessionInput,
): Promise<TheorySession | null> {
  const [row] = await db
    .update(theorySessions)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(theorySessions.id, id))
    .returning();
  return row ? toTheorySession(row) : null;
}

export async function deleteTheorySession(id: string): Promise<boolean> {
  const rows = await db.delete(theorySessions).where(eq(theorySessions.id, id)).returning({
    id: theorySessions.id,
  });
  return rows.length > 0;
}

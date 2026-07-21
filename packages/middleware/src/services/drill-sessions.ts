import { desc, eq } from "drizzle-orm";
import type {
  CreateDrillSessionInput,
  DrillSession,
  UpdateDrillSessionInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { drillSessions, type DrillSessionRow } from "@/db/schema";

/** Map a DB row to the shared `DrillSession` wire type. */
function toDrillSession(row: DrillSessionRow): DrillSession {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    notes: row.notes,
    mistakes: row.mistakes ?? null,
    questions: row.questions,
    type: row.type ?? null,
    learningArea: row.learningArea ?? null,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

/** Drizzle insert shape for one drill-session row, from the create input. */
function toInsert(input: CreateDrillSessionInput) {
  return {
    date: input.date,
    title: input.title ?? null,
    notes: input.notes ?? null,
    mistakes: input.mistakes ?? null,
    questions: input.questions ?? 0,
    type: input.type ?? null,
    learningArea: input.learningArea ?? null,
  };
}

/** List drill sessions, most recent date first. */
export async function listDrillSessions(): Promise<DrillSession[]> {
  const rows = await db
    .select()
    .from(drillSessions)
    .orderBy(desc(drillSessions.date), desc(drillSessions.createdAt));
  return rows.map(toDrillSession);
}

export async function getDrillSession(id: string): Promise<DrillSession | null> {
  const [row] = await db.select().from(drillSessions).where(eq(drillSessions.id, id));
  return row ? toDrillSession(row) : null;
}

export async function createDrillSession(input: CreateDrillSessionInput): Promise<DrillSession> {
  const [row] = await db.insert(drillSessions).values(toInsert(input)).returning();
  return toDrillSession(row);
}

export async function updateDrillSession(
  id: string,
  input: UpdateDrillSessionInput,
): Promise<DrillSession | null> {
  const [row] = await db
    .update(drillSessions)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(drillSessions.id, id))
    .returning();
  return row ? toDrillSession(row) : null;
}

export async function deleteDrillSession(id: string): Promise<boolean> {
  const rows = await db.delete(drillSessions).where(eq(drillSessions.id, id)).returning({
    id: drillSessions.id,
  });
  return rows.length > 0;
}

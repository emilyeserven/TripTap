import { desc, eq } from "drizzle-orm";
import type {
  CreateShadowingSessionInput,
  ShadowingSession,
  UpdateShadowingSessionInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { shadowingSessions, type ShadowingSessionRow } from "@/db/schema";

/** Map a DB row to the shared `ShadowingSession` wire type. */
function toShadowingSession(row: ShadowingSessionRow): ShadowingSession {
  return {
    id: row.id,
    title: row.title,
    videoUrl: row.videoUrl,
    language: row.language,
    bookmarkId: row.bookmarkId,
    bookmarkTitle: row.bookmarkTitle,
    bookmarkUrl: row.bookmarkUrl,
    defaultMaxReplays: row.defaultMaxReplays,
    defaultGapMs: row.defaultGapMs,
    segments: row.segments ?? null,
    entries: row.entries ?? null,
    terms: row.terms ?? null,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

/** Drizzle insert shape for one shadowing-session row, from the create input. */
function toInsert(input: CreateShadowingSessionInput) {
  return {
    title: input.title,
    videoUrl: input.videoUrl ?? null,
    language: input.language,
    bookmarkId: input.bookmarkId ?? null,
    bookmarkTitle: input.bookmarkTitle ?? null,
    bookmarkUrl: input.bookmarkUrl ?? null,
    defaultMaxReplays: input.defaultMaxReplays ?? 3,
    defaultGapMs: input.defaultGapMs ?? 0,
    segments: input.segments ?? null,
    entries: input.entries ?? null,
    terms: input.terms ?? null,
  };
}

/** List shadowing sessions, newest first. */
export async function listShadowingSessions(): Promise<ShadowingSession[]> {
  const rows = await db.select().from(shadowingSessions).orderBy(desc(shadowingSessions.createdAt));
  return rows.map(toShadowingSession);
}

export async function getShadowingSession(id: string): Promise<ShadowingSession | null> {
  const [row] = await db.select().from(shadowingSessions).where(eq(shadowingSessions.id, id));
  return row ? toShadowingSession(row) : null;
}

export async function createShadowingSession(
  input: CreateShadowingSessionInput,
): Promise<ShadowingSession> {
  const [row] = await db.insert(shadowingSessions).values(toInsert(input)).returning();
  return toShadowingSession(row);
}

export async function updateShadowingSession(
  id: string,
  input: UpdateShadowingSessionInput,
): Promise<ShadowingSession | null> {
  const [row] = await db
    .update(shadowingSessions)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(shadowingSessions.id, id))
    .returning();
  return row ? toShadowingSession(row) : null;
}

export async function deleteShadowingSession(id: string): Promise<boolean> {
  const rows = await db.delete(shadowingSessions).where(eq(shadowingSessions.id, id)).returning({
    id: shadowingSessions.id,
  });
  return rows.length > 0;
}

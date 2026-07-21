import { desc, eq } from "drizzle-orm";
import type {
  CreateShadowingSessionInput,
  ShadowingSession,
  UpdateShadowingSessionInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { shadowingSessions, type ShadowingSessionRow } from "@/db/schema";
import { newId } from "@/lib/id";
import { deleteMedia, getMedia, MEDIA_PREFIX, putMedia, type StoredMedia } from "@/services/media";

/** Object-storage key for an uploaded audio file, keeping the original extension for content sniffing. */
function mediaKey(filename: string): string {
  const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : "";
  return `${MEDIA_PREFIX}${newId()}${ext}`;
}

/** Map a DB row to the shared `ShadowingSession` wire type. */
function toShadowingSession(row: ShadowingSessionRow): ShadowingSession {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    videoUrl: row.videoUrl,
    language: row.language,
    bookmarkId: row.bookmarkId,
    bookmarkTitle: row.bookmarkTitle,
    bookmarkUrl: row.bookmarkUrl,
    section: row.section ?? null,
    defaultMaxReplays: row.defaultMaxReplays,
    defaultGapMs: row.defaultGapMs,
    completedLoops: row.completedLoops,
    hasAudio: row.audioKey != null,
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
    date: input.date,
    title: input.title,
    videoUrl: input.videoUrl ?? null,
    language: input.language,
    bookmarkId: input.bookmarkId ?? null,
    bookmarkTitle: input.bookmarkTitle ?? null,
    bookmarkUrl: input.bookmarkUrl ?? null,
    section: input.section ?? null,
    defaultMaxReplays: input.defaultMaxReplays ?? 3,
    defaultGapMs: input.defaultGapMs ?? 0,
    completedLoops: input.completedLoops ?? 0,
    segments: input.segments ?? null,
    entries: input.entries ?? null,
    terms: input.terms ?? null,
  };
}

/** List shadowing sessions, most recent date first. */
export async function listShadowingSessions(): Promise<ShadowingSession[]> {
  const rows = await db
    .select()
    .from(shadowingSessions)
    .orderBy(desc(shadowingSessions.date), desc(shadowingSessions.createdAt));
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
    audioKey: shadowingSessions.audioKey,
  });
  if (rows.length === 0) return false;
  // Best-effort media cleanup so deleting a session doesn't orphan its audio in object storage.
  await deleteMedia(rows[0].audioKey);
  return true;
}

/** Fetch a session's stored audio bytes from object storage, or null when it has none. */
export async function getShadowingSessionMedia(id: string): Promise<StoredMedia | null> {
  const [row] = await db
    .select({
      audioKey: shadowingSessions.audioKey,
      audioMime: shadowingSessions.audioMime,
    })
    .from(shadowingSessions)
    .where(eq(shadowingSessions.id, id));
  if (!row?.audioKey) return null;
  const media = await getMedia(row.audioKey);
  return media
    ? {
      body: media.body,
      contentType: row.audioMime ?? media.contentType,
    }
    : null;
}

/**
 * Store (or replace) a session's uploaded audio file. Uploads the new object first, points the row at
 * it, then deletes the previous object so a mid-swap failure never leaves the row referencing a missing
 * key. Returns the updated session, or null when the session doesn't exist.
 */
export async function setShadowingSessionAudio(
  id: string,
  buffer: Buffer,
  filename: string,
  mime: string,
): Promise<ShadowingSession | null> {
  const [existing] = await db
    .select({
      audioKey: shadowingSessions.audioKey,
    })
    .from(shadowingSessions)
    .where(eq(shadowingSessions.id, id));
  if (!existing) return null;

  const key = await putMedia(mediaKey(filename), buffer, mime);
  const [row] = await db
    .update(shadowingSessions)
    .set({
      audioKey: key,
      audioMime: mime,
      updatedAt: new Date(),
    })
    .where(eq(shadowingSessions.id, id))
    .returning();
  if (!row) {
    // The session vanished between the existence check and the update; don't leak the new object.
    await deleteMedia(key);
    return null;
  }
  if (existing.audioKey && existing.audioKey !== key) await deleteMedia(existing.audioKey);
  return toShadowingSession(row);
}

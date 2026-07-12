import { desc, eq } from "drizzle-orm";
import type {
  CreateListeningSessionInput,
  ListeningSession,
  UpdateListeningSessionInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { listeningSessions, type ListeningSessionRow } from "@/db/schema";

/** Map a DB row to the shared `ListeningSession` wire type. */
export function toListeningSession(row: ListeningSessionRow): ListeningSession {
  return {
    id: row.id,
    title: row.title,
    videoUrl: row.videoUrl,
    language: row.language,
    bookmarkId: row.bookmarkId,
    bookmarkTitle: row.bookmarkTitle,
    bookmarkUrl: row.bookmarkUrl,
    entries: row.entries ?? null,
    terms: row.terms ?? null,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

/** Drizzle insert shape for one listening-session row, from the create input. */
function toInsert(input: CreateListeningSessionInput) {
  return {
    title: input.title,
    videoUrl: input.videoUrl ?? null,
    language: input.language,
    bookmarkId: input.bookmarkId ?? null,
    bookmarkTitle: input.bookmarkTitle ?? null,
    bookmarkUrl: input.bookmarkUrl ?? null,
    entries: input.entries ?? null,
    terms: input.terms ?? null,
  };
}

/** List listening sessions, newest first. */
export async function listListeningSessions(): Promise<ListeningSession[]> {
  const rows = await db.select().from(listeningSessions).orderBy(desc(listeningSessions.createdAt));
  return rows.map(toListeningSession);
}

export async function getListeningSession(id: string): Promise<ListeningSession | null> {
  const [row] = await db.select().from(listeningSessions).where(eq(listeningSessions.id, id));
  return row ? toListeningSession(row) : null;
}

export async function createListeningSession(
  input: CreateListeningSessionInput,
): Promise<ListeningSession> {
  const [row] = await db.insert(listeningSessions).values(toInsert(input)).returning();
  return toListeningSession(row);
}

export async function updateListeningSession(
  id: string,
  input: UpdateListeningSessionInput,
): Promise<ListeningSession | null> {
  const [row] = await db
    .update(listeningSessions)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(listeningSessions.id, id))
    .returning();
  return row ? toListeningSession(row) : null;
}

export async function deleteListeningSession(id: string): Promise<boolean> {
  const rows = await db.delete(listeningSessions).where(eq(listeningSessions.id, id)).returning({
    id: listeningSessions.id,
  });
  return rows.length > 0;
}

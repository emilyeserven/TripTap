import { desc } from "drizzle-orm";
import type {
  CreateListeningSessionInput,
  ListeningSession,
} from "@sentence-bank/types";
import { listeningSessions, type ListeningSessionRow } from "@/db/schema";
import { crudService } from "@/services/crud";
import { toIso } from "@/services/rows";

/** Map a DB row to the shared `ListeningSession` wire type. */
function toListeningSession(row: ListeningSessionRow): ListeningSession {
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
    entries: row.entries ?? null,
    passive: row.passive,
    durationMinutes: row.durationMinutes,
    terms: row.terms ?? null,
    learningArea: row.learningArea ?? null,
    countsTowardXp: row.countsTowardXp,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** Drizzle insert shape for one listening-session row, from the create input. */
function toInsert(input: CreateListeningSessionInput) {
  return {
    date: input.date,
    title: input.title,
    videoUrl: input.videoUrl ?? null,
    language: input.language,
    bookmarkId: input.bookmarkId ?? null,
    bookmarkTitle: input.bookmarkTitle ?? null,
    bookmarkUrl: input.bookmarkUrl ?? null,
    section: input.section ?? null,
    entries: input.entries ?? null,
    passive: input.passive ?? false,
    durationMinutes: input.durationMinutes ?? 0,
    terms: input.terms ?? null,
    learningArea: input.learningArea ?? null,
    countsTowardXp: input.countsTowardXp ?? true,
  };
}

const crud = crudService(listeningSessions, {
  toWire: toListeningSession,
  toInsert,
  orderBy: [desc(listeningSessions.date), desc(listeningSessions.createdAt)],
});

/** List listening sessions, most recent date first. */
export const listListeningSessions = crud.list;
export const getListeningSession = crud.get;
export const createListeningSession = crud.create;
export const updateListeningSession = crud.update;
export const deleteListeningSession = crud.remove;

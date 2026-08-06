import { desc } from "drizzle-orm";
import type {
  CreateTheorySessionInput,
  TheorySession,
} from "@sentence-bank/types";
import { theorySessions, type TheorySessionRow } from "@/db/schema";
import { crudService } from "@/services/crud";
import { toIso } from "@/services/rows";

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
    learningArea: row.learningArea ?? null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
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
    learningArea: input.learningArea ?? null,
  };
}

const crud = crudService(theorySessions, {
  toWire: toTheorySession,
  toInsert,
  orderBy: [desc(theorySessions.date), desc(theorySessions.createdAt)],
});

/** List theory sessions, most recent date first. */
export const listTheorySessions = crud.list;
export const getTheorySession = crud.get;
export const createTheorySession = crud.create;
export const updateTheorySession = crud.update;
export const deleteTheorySession = crud.remove;

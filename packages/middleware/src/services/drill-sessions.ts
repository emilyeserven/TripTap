import { desc } from "drizzle-orm";
import type {
  CreateDrillSessionInput,
  DrillSession,
} from "@sentence-bank/types";
import { drillSessions, type DrillSessionRow } from "@/db/schema";
import { crudService } from "@/services/crud";
import { toIso } from "@/services/rows";

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
    bookmarkId: row.bookmarkId ?? null,
    bookmarkTitle: row.bookmarkTitle ?? null,
    bookmarkUrl: row.bookmarkUrl ?? null,
    section: row.section ?? null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
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
    bookmarkId: input.bookmarkId ?? null,
    bookmarkTitle: input.bookmarkTitle ?? null,
    bookmarkUrl: input.bookmarkUrl ?? null,
    section: input.section ?? null,
  };
}

const crud = crudService(drillSessions, {
  toWire: toDrillSession,
  toInsert,
  orderBy: [desc(drillSessions.date), desc(drillSessions.createdAt)],
});

/** List drill sessions, most recent date first. */
export const listDrillSessions = crud.list;
export const getDrillSession = crud.get;
export const createDrillSession = crud.create;
export const updateDrillSession = crud.update;
export const deleteDrillSession = crud.remove;

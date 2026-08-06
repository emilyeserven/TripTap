import { desc, eq } from "drizzle-orm";
import type {
  AnswerSheet,
  AnswerSheetEntry,
  CreateAnswerSheetInput,
  UpdateAnswerSheetInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { answerSheets, type AnswerSheetRow } from "@/db/schema";
import { crudService } from "@/services/crud";
import { toIso, toIsoOrNull } from "@/services/rows";

/** An entry as it may exist in older JSONB rows, before `needsCorrection` was replaced by `correct`. */
type LegacyEntry = AnswerSheetEntry & { needsCorrection?: boolean };

/**
 * Map one stored entry to the current wire shape. Older rows carry a `needsCorrection` boolean instead
 * of `correct`; drop it (the strict route schema forbids stray keys) and derive `correct` from it — a
 * flagged answer becomes `false` (wrong), anything else stays `null` (not yet reviewed).
 */
function normalizeEntry(e: AnswerSheetEntry): AnswerSheetEntry {
  const legacy = e as LegacyEntry;
  return {
    slotId: e.slotId,
    value: e.value ?? "",
    correct: e.correct ?? (legacy.needsCorrection === true ? false : null),
    correction: e.correction ?? null,
    reasoning: e.reasoning ?? null,
    intendedMeaning: e.intendedMeaning ?? null,
    actualMeaning: e.actualMeaning ?? null,
    marks: e.marks ?? null,
  };
}

/** Map a DB row to the shared `AnswerSheet` wire type. */
function toAnswerSheet(row: AnswerSheetRow): AnswerSheet {
  return {
    id: row.id,
    questionSheetId: row.questionSheetId,
    title: row.title,
    date: toIsoOrNull(row.date),
    entries: (row.entries ?? []).map(normalizeEntry),
    hiddenPartIds: row.hiddenPartIds ?? null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** Drizzle insert shape for one answer sheet row, from the create input. */
function toInsert(input: CreateAnswerSheetInput) {
  return {
    questionSheetId: input.questionSheetId,
    title: input.title ?? null,
    date: input.date ? new Date(input.date) : null,
    entries: input.entries ?? null,
    hiddenPartIds: input.hiddenPartIds ?? null,
  };
}

const crud = crudService(answerSheets, {
  toWire: toAnswerSheet,
  toInsert,
  orderBy: [desc(answerSheets.createdAt)],
});

/** List answer sheets, newest first; optionally scoped to one question sheet. */
export function listAnswerSheets(
  filters: { questionSheetId?: string } = {},
): Promise<AnswerSheet[]> {
  return crud.list(
    filters.questionSheetId
      ? eq(answerSheets.questionSheetId, filters.questionSheetId)
      : undefined,
  );
}

export const getAnswerSheet = crud.get;
export const createAnswerSheet = crud.create;
export const deleteAnswerSheet = crud.remove;

/** Hand-written because `date` arrives as an ISO string and has to become a `Date` column. */
export async function updateAnswerSheet(
  id: string,
  input: UpdateAnswerSheetInput,
): Promise<AnswerSheet | null> {
  const [row] = await db
    .update(answerSheets)
    .set({
      ...input,
      date: input.date === undefined ? undefined : (input.date ? new Date(input.date) : null),
      updatedAt: new Date(),
    })
    .where(eq(answerSheets.id, id))
    .returning();
  return row ? toAnswerSheet(row) : null;
}

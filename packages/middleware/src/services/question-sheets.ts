import { desc, eq } from "drizzle-orm";
import type {
  CreateQuestionSheetInput,
  QuestionSheet,
  UpdateQuestionSheetInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { questionSheets, type QuestionSheetRow } from "@/db/schema";
import { crudService } from "@/services/crud";
import { toIso, toIsoOrNull } from "@/services/rows";

/** Map a DB row to the shared `QuestionSheet` wire type. */
function toQuestionSheet(row: QuestionSheetRow): QuestionSheet {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    page: row.page,
    bookmarkId: row.bookmarkId,
    bookmarkTitle: row.bookmarkTitle,
    bookmarkUrl: row.bookmarkUrl,
    sections: row.sections ?? [],
    dueDate: toIsoOrNull(row.dueDate),
    firstQuestionNumber: row.firstQuestionNumber ?? 1,
    learningAreas: row.learningAreas ?? [],
    grammarTerms: row.grammarTerms ?? [],
    layout: row.layout === "grid" ? "grid" : "list",
    questions: row.questions ?? [],
    grid: row.grid ?? null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** Drizzle insert shape for one question sheet row, from the create input. */
function toInsert(input: CreateQuestionSheetInput) {
  return {
    title: input.title,
    notes: input.notes ?? null,
    page: input.page ?? null,
    bookmarkId: input.bookmarkId ?? null,
    bookmarkTitle: input.bookmarkTitle ?? null,
    bookmarkUrl: input.bookmarkUrl ?? null,
    sections: input.sections ?? null,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    firstQuestionNumber: input.firstQuestionNumber ?? 1,
    learningAreas: input.learningAreas ?? null,
    grammarTerms: input.grammarTerms ?? null,
    layout: input.layout,
    questions: input.questions ?? null,
    grid: input.grid ?? null,
  };
}

const crud = crudService(questionSheets, {
  toWire: toQuestionSheet,
  toInsert,
  orderBy: [desc(questionSheets.createdAt)],
});

/** List question sheets, newest first. */
export const listQuestionSheets = crud.list;
export const getQuestionSheet = crud.get;
export const createQuestionSheet = crud.create;
export const deleteQuestionSheet = crud.remove;

/** Hand-written because `dueDate` arrives as an ISO string and has to become a `Date` column. */
export async function updateQuestionSheet(
  id: string,
  input: UpdateQuestionSheetInput,
): Promise<QuestionSheet | null> {
  const [row] = await db
    .update(questionSheets)
    .set({
      ...input,
      dueDate: input.dueDate === undefined ? undefined : (input.dueDate ? new Date(input.dueDate) : null),
      updatedAt: new Date(),
    })
    .where(eq(questionSheets.id, id))
    .returning();
  return row ? toQuestionSheet(row) : null;
}

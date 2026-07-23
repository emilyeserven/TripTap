import { desc, eq } from "drizzle-orm";
import type {
  CreateQuestionSheetInput,
  QuestionSheet,
  UpdateQuestionSheetInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { questionSheets, type QuestionSheetRow } from "@/db/schema";

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
    dueDate: row.dueDate instanceof Date ? row.dueDate.toISOString() : (row.dueDate ?? null),
    firstQuestionNumber: row.firstQuestionNumber ?? 1,
    learningAreas: row.learningAreas ?? [],
    grammarTerms: row.grammarTerms ?? [],
    layout: row.layout === "grid" ? "grid" : "list",
    questions: row.questions ?? [],
    grid: row.grid ?? null,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
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

/** List question sheets, newest first. */
export async function listQuestionSheets(): Promise<QuestionSheet[]> {
  const rows = await db.select().from(questionSheets).orderBy(desc(questionSheets.createdAt));
  return rows.map(toQuestionSheet);
}

export async function getQuestionSheet(id: string): Promise<QuestionSheet | null> {
  const [row] = await db.select().from(questionSheets).where(eq(questionSheets.id, id));
  return row ? toQuestionSheet(row) : null;
}

export async function createQuestionSheet(
  input: CreateQuestionSheetInput,
): Promise<QuestionSheet> {
  const [row] = await db.insert(questionSheets).values(toInsert(input)).returning();
  return toQuestionSheet(row);
}

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

export async function deleteQuestionSheet(id: string): Promise<boolean> {
  const rows = await db.delete(questionSheets).where(eq(questionSheets.id, id)).returning({
    id: questionSheets.id,
  });
  return rows.length > 0;
}

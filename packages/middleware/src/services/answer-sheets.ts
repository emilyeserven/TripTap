import { desc, eq } from "drizzle-orm";
import type {
  AnswerSheet,
  CreateAnswerSheetInput,
  UpdateAnswerSheetInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { answerSheets, type AnswerSheetRow } from "@/db/schema";

/** Map a DB row to the shared `AnswerSheet` wire type. */
export function toAnswerSheet(row: AnswerSheetRow): AnswerSheet {
  return {
    id: row.id,
    questionSheetId: row.questionSheetId,
    title: row.title,
    entries: row.entries ?? [],
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

/** Drizzle insert shape for one answer sheet row, from the create input. */
function toInsert(input: CreateAnswerSheetInput) {
  return {
    questionSheetId: input.questionSheetId,
    title: input.title ?? null,
    entries: input.entries ?? null,
  };
}

/** List answer sheets, newest first. */
export async function listAnswerSheets(): Promise<AnswerSheet[]> {
  const rows = await db.select().from(answerSheets).orderBy(desc(answerSheets.createdAt));
  return rows.map(toAnswerSheet);
}

export async function getAnswerSheet(id: string): Promise<AnswerSheet | null> {
  const [row] = await db.select().from(answerSheets).where(eq(answerSheets.id, id));
  return row ? toAnswerSheet(row) : null;
}

export async function createAnswerSheet(input: CreateAnswerSheetInput): Promise<AnswerSheet> {
  const [row] = await db.insert(answerSheets).values(toInsert(input)).returning();
  return toAnswerSheet(row);
}

export async function updateAnswerSheet(
  id: string,
  input: UpdateAnswerSheetInput,
): Promise<AnswerSheet | null> {
  const [row] = await db
    .update(answerSheets)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(answerSheets.id, id))
    .returning();
  return row ? toAnswerSheet(row) : null;
}

export async function deleteAnswerSheet(id: string): Promise<boolean> {
  const rows = await db.delete(answerSheets).where(eq(answerSheets.id, id)).returning({
    id: answerSheets.id,
  });
  return rows.length > 0;
}

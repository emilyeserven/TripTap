import { desc, eq } from "drizzle-orm";
import type {
  CreateWritingInput,
  UpdateWritingInput,
  Writing,
} from "@sentence-bank/types";
import { db } from "@/db";
import { writings, type WritingRow } from "@/db/schema";

/** Map a DB row to the shared `Writing` wire type. */
function toWriting(row: WritingRow): Writing {
  return {
    id: row.id,
    date: row.date,
    text: row.text,
    meaning: row.meaning,
    comments: row.comments,
    language: row.language,
    readyToReview: row.readyToReview,
    terms: row.terms ?? null,
    corrections: row.corrections ?? null,
    promptTitle: row.promptTitle ?? null,
    promptText: row.promptText ?? null,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

/** Drizzle insert shape for one writing row, from the create input. */
function toInsert(input: CreateWritingInput) {
  return {
    date: input.date,
    text: input.text,
    meaning: input.meaning ?? null,
    comments: input.comments ?? null,
    language: input.language,
    readyToReview: input.readyToReview ?? false,
    terms: input.terms ?? null,
    corrections: input.corrections ?? null,
    promptTitle: input.promptTitle ?? null,
    promptText: input.promptText ?? null,
  };
}

/** List writings, most recent date first. */
export async function listWritings(): Promise<Writing[]> {
  const rows = await db
    .select()
    .from(writings)
    .orderBy(desc(writings.date), desc(writings.createdAt));
  return rows.map(toWriting);
}

export async function getWriting(id: string): Promise<Writing | null> {
  const [row] = await db.select().from(writings).where(eq(writings.id, id));
  return row ? toWriting(row) : null;
}

export async function createWriting(input: CreateWritingInput): Promise<Writing> {
  const [row] = await db.insert(writings).values(toInsert(input)).returning();
  return toWriting(row);
}

export async function updateWriting(
  id: string,
  input: UpdateWritingInput,
): Promise<Writing | null> {
  const [row] = await db
    .update(writings)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(writings.id, id))
    .returning();
  return row ? toWriting(row) : null;
}

export async function deleteWriting(id: string): Promise<boolean> {
  const rows = await db.delete(writings).where(eq(writings.id, id)).returning({
    id: writings.id,
  });
  return rows.length > 0;
}

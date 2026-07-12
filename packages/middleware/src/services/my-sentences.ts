import { desc, eq } from "drizzle-orm";
import type {
  CreateMySentenceInput,
  MySentence,
  UpdateMySentenceInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { mySentences, type MySentenceRow } from "@/db/schema";

/** Map a DB row to the shared `MySentence` wire type. */
export function toMySentence(row: MySentenceRow): MySentence {
  return {
    id: row.id,
    text: row.text,
    translation: row.translation,
    language: row.language,
    practiceSentenceId: row.practiceSentenceId,
    needsCorrection: row.needsCorrection,
    correction: row.correction,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

/** Drizzle insert shape for one my-sentence row, from the create input. */
function toInsert(input: CreateMySentenceInput) {
  return {
    text: input.text,
    translation: input.translation ?? null,
    language: input.language,
    practiceSentenceId: input.practiceSentenceId ?? null,
    needsCorrection: input.needsCorrection ?? true,
    correction: input.correction ?? null,
  };
}

/** List my-sentences, newest first; optionally scoped to one practice sentence. */
export async function listMySentences(practiceSentenceId?: string): Promise<MySentence[]> {
  const rows = practiceSentenceId
    ? await db
      .select()
      .from(mySentences)
      .where(eq(mySentences.practiceSentenceId, practiceSentenceId))
      .orderBy(desc(mySentences.createdAt))
    : await db.select().from(mySentences).orderBy(desc(mySentences.createdAt));
  return rows.map(toMySentence);
}

export async function getMySentence(id: string): Promise<MySentence | null> {
  const [row] = await db.select().from(mySentences).where(eq(mySentences.id, id));
  return row ? toMySentence(row) : null;
}

export async function createMySentence(input: CreateMySentenceInput): Promise<MySentence> {
  const [row] = await db.insert(mySentences).values(toInsert(input)).returning();
  return toMySentence(row);
}

export async function updateMySentence(
  id: string,
  input: UpdateMySentenceInput,
): Promise<MySentence | null> {
  const [row] = await db
    .update(mySentences)
    .set(input)
    .where(eq(mySentences.id, id))
    .returning();
  return row ? toMySentence(row) : null;
}

export async function deleteMySentence(id: string): Promise<boolean> {
  const rows = await db.delete(mySentences).where(eq(mySentences.id, id)).returning({
    id: mySentences.id,
  });
  return rows.length > 0;
}

import { and, desc, eq } from "drizzle-orm";
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
    writingId: row.writingId,
    lessonId: row.lessonId,
    needsCorrection: row.needsCorrection,
    correction: row.correction,
    actualMeaning: row.actualMeaning,
    explanation: row.explanation,
    terms: row.terms ?? null,
    reasons: row.reasons ?? null,
    marks: row.marks ?? null,
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
    writingId: input.writingId ?? null,
    lessonId: input.lessonId ?? null,
    needsCorrection: input.needsCorrection ?? true,
    correction: input.correction ?? null,
    actualMeaning: input.actualMeaning ?? null,
    explanation: input.explanation ?? null,
    terms: input.terms ?? null,
    reasons: input.reasons ?? null,
    marks: input.marks ?? null,
  };
}

/** List my-sentences, newest first; optionally scoped to one practice sentence and/or lesson. */
export async function listMySentences(
  filters: { practiceSentenceId?: string;
    lessonId?: string; } = {},
): Promise<MySentence[]> {
  const conditions = [
    filters.practiceSentenceId
      ? eq(mySentences.practiceSentenceId, filters.practiceSentenceId)
      : undefined,
    filters.lessonId ? eq(mySentences.lessonId, filters.lessonId) : undefined,
  ].filter(c => c !== undefined);

  const rows = conditions.length > 0
    ? await db
      .select()
      .from(mySentences)
      .where(and(...conditions))
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

/** Create many my-sentences in a single insert (used by the bulk-paste import flow). */
export async function createMySentencesMany(
  inputs: CreateMySentenceInput[],
): Promise<MySentence[]> {
  if (inputs.length === 0) return [];
  const rows = await db.insert(mySentences).values(inputs.map(toInsert)).returning();
  return rows.map(toMySentence);
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

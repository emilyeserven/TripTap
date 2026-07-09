import { desc, eq } from "drizzle-orm";
import type { CreateSentenceInput, Sentence, UpdateSentenceInput } from "@sentence-bank/types";
import { db } from "@/db";
import { sentences, type SentenceRow } from "@/db/schema";

/** Map a DB row to the shared `Sentence` wire type. */
function toSentence(row: SentenceRow): Sentence {
  return {
    id: row.id,
    text: row.text,
    translation: row.translation,
    language: row.language,
    source: row.source,
    notes: row.notes,
    tags: row.tags,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

export async function listSentences(): Promise<Sentence[]> {
  const rows = await db.select().from(sentences).orderBy(desc(sentences.createdAt));
  return rows.map(toSentence);
}

export async function getSentence(id: string): Promise<Sentence | null> {
  const [row] = await db.select().from(sentences).where(eq(sentences.id, id));
  return row ? toSentence(row) : null;
}

export async function createSentence(input: CreateSentenceInput): Promise<Sentence> {
  const [row] = await db
    .insert(sentences)
    .values({
      text: input.text,
      translation: input.translation,
      language: input.language,
      source: input.source ?? null,
      notes: input.notes ?? null,
      tags: input.tags ?? null,
    })
    .returning();
  return toSentence(row);
}

export async function updateSentence(id: string, input: UpdateSentenceInput): Promise<Sentence | null> {
  const [row] = await db.update(sentences).set(input).where(eq(sentences.id, id)).returning();
  return row ? toSentence(row) : null;
}

export async function deleteSentence(id: string): Promise<boolean> {
  const rows = await db.delete(sentences).where(eq(sentences.id, id)).returning({
    id: sentences.id,
  });
  return rows.length > 0;
}

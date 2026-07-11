import { desc, eq } from "drizzle-orm";
import type { CreateSentenceInput, Sentence, UpdateSentenceInput } from "@sentence-bank/types";
import { db } from "@/db";
import { sentences, sentenceVocab, type SentenceRow } from "@/db/schema";

/** Map a DB row to the shared `Sentence` wire type. */
function toSentence(row: SentenceRow): Sentence {
  return {
    id: row.id,
    text: row.text,
    translation: row.translation,
    language: row.language,
    source: row.source,
    sourceId: row.sourceId,
    page: row.page,
    notes: row.notes,
    tags: row.tags,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

/** Drizzle insert shape for one sentence row, from the create input. */
function toInsert(input: CreateSentenceInput) {
  return {
    text: input.text,
    translation: input.translation ?? null,
    language: input.language,
    source: input.source ?? null,
    sourceId: input.sourceId ?? null,
    page: input.page ?? null,
    notes: input.notes ?? null,
    tags: input.tags ?? null,
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

/** Link rows for a sentence's vocab ids, deduped and ignoring empties. */
function linkRows(sentenceId: string, vocabIds: string[] | undefined) {
  return [...new Set((vocabIds ?? []).filter(Boolean))].map(vocabId => ({
    sentenceId,
    vocabId,
  }));
}

export async function createSentence(input: CreateSentenceInput): Promise<Sentence> {
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(sentences).values(toInsert(input)).returning();
    const links = linkRows(row.id, input.vocabIds);
    if (links.length > 0) await tx.insert(sentenceVocab).values(links);
    return toSentence(row);
  });
}

/** Create many sentences (and their vocab links) in a single transaction. */
export async function createSentencesMany(inputs: CreateSentenceInput[]): Promise<Sentence[]> {
  if (inputs.length === 0) return [];
  return db.transaction(async (tx) => {
    const rows = await tx.insert(sentences).values(inputs.map(toInsert)).returning();
    const links = rows.flatMap((row, i) => linkRows(row.id, inputs[i].vocabIds));
    if (links.length > 0) await tx.insert(sentenceVocab).values(links);
    return rows.map(toSentence);
  });
}

export async function updateSentence(id: string, input: UpdateSentenceInput): Promise<Sentence | null> {
  // `vocabIds` is managed via PUT /api/sentences/:id/vocab, not as a sentence column.
  const {
    vocabIds, ...columns
  } = input;
  if (vocabIds !== undefined) {
    // Intentionally ignored here — links are set through the dedicated endpoint.
  }
  const [row] = await db.update(sentences).set(columns).where(eq(sentences.id, id)).returning();
  return row ? toSentence(row) : null;
}

export async function deleteSentence(id: string): Promise<boolean> {
  const rows = await db.delete(sentences).where(eq(sentences.id, id)).returning({
    id: sentences.id,
  });
  return rows.length > 0;
}

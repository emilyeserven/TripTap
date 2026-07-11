import { asc, desc, eq } from "drizzle-orm";
import type { CreateVocabInput, Sentence, UpdateVocabInput, Vocab } from "@sentence-bank/types";
import { db } from "@/db";
import { sentences, sentenceVocab, vocab, type VocabRow } from "@/db/schema";
import { toSentence } from "@/services/sentences";

/** Map a DB row to the shared `Vocab` wire type. */
export function toVocab(row: VocabRow): Vocab {
  return {
    id: row.id,
    term: row.term,
    reading: row.reading,
    meaning: row.meaning,
    language: row.language,
    sourceId: row.sourceId,
    page: row.page,
    tags: row.tags,
    notes: row.notes,
    captureId: row.captureId,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

function toInsert(input: CreateVocabInput) {
  return {
    term: input.term,
    reading: input.reading ?? null,
    meaning: input.meaning ?? null,
    language: input.language,
    sourceId: input.sourceId ?? null,
    page: input.page ?? null,
    tags: input.tags ?? null,
    notes: input.notes ?? null,
    captureId: input.captureId ?? null,
  };
}

export async function listVocab(): Promise<Vocab[]> {
  const rows = await db.select().from(vocab).orderBy(desc(vocab.createdAt));
  return rows.map(toVocab);
}

/** Vocab mined from a given capture, oldest first. */
export async function listVocabByCapture(captureId: string): Promise<Vocab[]> {
  const rows = await db
    .select()
    .from(vocab)
    .where(eq(vocab.captureId, captureId))
    .orderBy(asc(vocab.createdAt));
  return rows.map(toVocab);
}

export async function createVocab(input: CreateVocabInput): Promise<Vocab> {
  const [row] = await db.insert(vocab).values(toInsert(input)).returning();
  return toVocab(row);
}

export async function createVocabMany(inputs: CreateVocabInput[]): Promise<Vocab[]> {
  if (inputs.length === 0) return [];
  const rows = await db.insert(vocab).values(inputs.map(toInsert)).returning();
  return rows.map(toVocab);
}

export async function updateVocab(id: string, input: UpdateVocabInput): Promise<Vocab | null> {
  const [row] = await db.update(vocab).set(input).where(eq(vocab.id, id)).returning();
  return row ? toVocab(row) : null;
}

export async function deleteVocab(id: string): Promise<boolean> {
  const rows = await db.delete(vocab).where(eq(vocab.id, id)).returning({
    id: vocab.id,
  });
  return rows.length > 0;
}

/** Example sentences linked to a vocab item, oldest first. */
export async function getSentencesForVocab(id: string): Promise<Sentence[]> {
  const rows = await db
    .select({
      s: sentences,
    })
    .from(sentenceVocab)
    .innerJoin(sentences, eq(sentenceVocab.sentenceId, sentences.id))
    .where(eq(sentenceVocab.vocabId, id))
    .orderBy(asc(sentences.createdAt));
  return rows.map(({
    s,
  }) => toSentence(s));
}

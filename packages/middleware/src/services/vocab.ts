import { asc, desc, eq } from "drizzle-orm";
import type { CreateVocabInput, Sentence, Vocab } from "@sentence-bank/types";
import { db } from "@/db";
import { sentences, sentenceVocab, vocab, type VocabRow } from "@/db/schema";

/** Map a DB row to the shared `Vocab` wire type. */
function toVocab(row: VocabRow): Vocab {
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
  };
}

export async function listVocab(): Promise<Vocab[]> {
  const rows = await db.select().from(vocab).orderBy(desc(vocab.createdAt));
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
  }) => ({
    id: s.id,
    text: s.text,
    translation: s.translation,
    language: s.language,
    source: s.source,
    sourceId: s.sourceId,
    page: s.page,
    notes: s.notes,
    tags: s.tags,
    createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
  }));
}

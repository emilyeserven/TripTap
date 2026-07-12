import { asc, desc, eq, isNull } from "drizzle-orm";
import type { CreateSentenceInput, Sentence, UpdateSentenceInput } from "@sentence-bank/types";
import { db } from "@/db";
import { sentences, sentenceVocab, type SentenceRow } from "@/db/schema";
import { generateFurigana } from "@/services/furigana";

/** Map a DB row to the shared `Sentence` wire type. */
export function toSentence(row: SentenceRow): Sentence {
  return {
    id: row.id,
    text: row.text,
    translation: row.translation,
    reading: row.reading ?? null,
    language: row.language,
    source: row.source,
    sourceId: row.sourceId,
    page: row.page,
    notes: row.notes,
    tags: row.tags,
    captureId: row.captureId,
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
    captureId: input.captureId ?? null,
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

/** Sentences mined from a given capture, oldest first. */
export async function listSentencesByCapture(captureId: string): Promise<Sentence[]> {
  const rows = await db
    .select()
    .from(sentences)
    .where(eq(sentences.captureId, captureId))
    .orderBy(asc(sentences.createdAt));
  return rows.map(toSentence);
}

/** Link rows for a sentence's vocab ids, deduped and ignoring empties. */
function linkRows(sentenceId: string, vocabIds: string[] | undefined) {
  return [...new Set((vocabIds ?? []).filter(Boolean))].map(vocabId => ({
    sentenceId,
    vocabId,
  }));
}

export async function createSentence(input: CreateSentenceInput): Promise<Sentence> {
  // Generate furigana before the transaction so analysis never holds a DB lock open.
  const reading = await generateFurigana(input.text);
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(sentences).values({
      ...toInsert(input),
      reading,
    }).returning();
    const links = linkRows(row.id, input.vocabIds);
    if (links.length > 0) await tx.insert(sentenceVocab).values(links);
    return toSentence(row);
  });
}

/** Create many sentences (and their vocab links) in a single transaction. */
export async function createSentencesMany(inputs: CreateSentenceInput[]): Promise<Sentence[]> {
  if (inputs.length === 0) return [];
  const readings = await Promise.all(inputs.map(i => generateFurigana(i.text)));
  return db.transaction(async (tx) => {
    const rows = await tx
      .insert(sentences)
      .values(inputs.map((input, i) => ({
        ...toInsert(input),
        reading: readings[i],
      })))
      .returning();
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
  // Regenerate furigana when the text changes so the reading never goes stale.
  const patch = typeof columns.text === "string"
    ? {
      ...columns,
      reading: await generateFurigana(columns.text),
    }
    : columns;
  const [row] = await db.update(sentences).set(patch).where(eq(sentences.id, id)).returning();
  return row ? toSentence(row) : null;
}

/**
 * Generate furigana for every sentence that lacks it (one-time backfill for rows created before
 * furigana existed). Returns how many rows were updated.
 */
export async function backfillFurigana(): Promise<number> {
  const rows = await db
    .select({
      id: sentences.id,
      text: sentences.text,
    })
    .from(sentences)
    .where(isNull(sentences.reading));
  let updated = 0;
  for (const row of rows) {
    const reading = await generateFurigana(row.text);
    if (!reading) continue;
    await db.update(sentences).set({
      reading,
    }).where(eq(sentences.id, row.id));
    updated += 1;
  }
  return updated;
}

export async function deleteSentence(id: string): Promise<boolean> {
  const rows = await db.delete(sentences).where(eq(sentences.id, id)).returning({
    id: sentences.id,
  });
  return rows.length > 0;
}

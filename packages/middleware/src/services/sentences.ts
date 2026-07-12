import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { CreateSentenceInput, Sentence, UpdateSentenceInput } from "@sentence-bank/types";
import { db } from "@/db";
import { sentences, sentenceVocab, type SentenceRow, vocab } from "@/db/schema";
import { generateFurigana } from "@/services/furigana";

/**
 * Reading overrides for the furigana analyzer, sourced from the vocab bank: any vocab with a reading
 * wins over the analyzer's guess (so users fix names/mis-reads once, in vocab, and it applies here).
 */
async function getFuriganaOverrides(): Promise<Map<string, string>> {
  const rows = await db.select({
    term: vocab.term,
    reading: vocab.reading,
  }).from(vocab);
  const map = new Map<string, string>();
  for (const row of rows) {
    const term = row.term.trim();
    const reading = row.reading?.trim();
    if (term && reading) map.set(term, reading);
  }
  return map;
}

/** Map a DB row to the shared `Sentence` wire type. */
export function toSentence(row: SentenceRow): Sentence {
  return {
    id: row.id,
    text: row.text,
    translation: row.translation,
    reading: row.reading ?? null,
    readingError: row.readingError ?? null,
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

/**
 * Sentences mined from a given capture, in the user's manual order. Rows with an explicit
 * `sortOrder` sort ascending; never-reordered/new rows (null `sortOrder`) trail (Postgres sorts
 * NULLS LAST by default), each group broken by `createdAt` ascending.
 */
export async function listSentencesByCapture(captureId: string): Promise<Sentence[]> {
  const rows = await db
    .select()
    .from(sentences)
    .where(eq(sentences.captureId, captureId))
    .orderBy(asc(sentences.sortOrder), asc(sentences.createdAt));
  return rows.map(toSentence);
}

/**
 * Persist a manual ordering of a capture's sentences. `orderedIds` is the full set of the capture's
 * sentence ids in the desired order; each is assigned `sortOrder` = its index (scoped by
 * `captureId`, so ids from another capture are silently ignored). Returns the reordered list.
 */
export async function reorderCaptureSentences(
  captureId: string,
  orderedIds: string[],
): Promise<Sentence[]> {
  await db.transaction(async (tx) => {
    await Promise.all(
      orderedIds.map((id, index) =>
        tx
          .update(sentences)
          .set({
            sortOrder: index,
          })
          .where(and(eq(sentences.id, id), eq(sentences.captureId, captureId)))),
    );
  });
  return listSentencesByCapture(captureId);
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
  const {
    tokens, error,
  } = await generateFurigana(input.text, await getFuriganaOverrides());
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(sentences).values({
      ...toInsert(input),
      reading: tokens,
      readingError: error,
    }).returning();
    const links = linkRows(row.id, input.vocabIds);
    if (links.length > 0) await tx.insert(sentenceVocab).values(links);
    return toSentence(row);
  });
}

/** Create many sentences (and their vocab links) in a single transaction. */
export async function createSentencesMany(inputs: CreateSentenceInput[]): Promise<Sentence[]> {
  if (inputs.length === 0) return [];
  const overrides = await getFuriganaOverrides();
  const results = await Promise.all(inputs.map(i => generateFurigana(i.text, overrides)));
  return db.transaction(async (tx) => {
    const rows = await tx
      .insert(sentences)
      .values(inputs.map((input, i) => ({
        ...toInsert(input),
        reading: results[i].tokens,
        readingError: results[i].error,
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
  // An explicit `reading` (a manual edit) is used as-is and clears any prior error; otherwise a text
  // change regenerates the reading (and records any new error).
  let patch: Record<string, unknown> = columns;
  if (columns.reading !== undefined) {
    patch = {
      ...columns,
      readingError: null,
    };
  }
  else if (typeof columns.text === "string") {
    const {
      tokens, error,
    } = await generateFurigana(columns.text, await getFuriganaOverrides());
    patch = {
      ...columns,
      reading: tokens,
      readingError: error,
    };
  }
  const [row] = await db.update(sentences).set(patch).where(eq(sentences.id, id)).returning();
  return row ? toSentence(row) : null;
}

/** Re-run furigana generation for one sentence (applies current vocab overrides). */
export async function regenerateSentenceFurigana(id: string): Promise<Sentence | null> {
  const [existing] = await db
    .select({
      text: sentences.text,
    })
    .from(sentences)
    .where(eq(sentences.id, id));
  if (!existing) return null;
  const {
    tokens, error,
  } = await generateFurigana(existing.text, await getFuriganaOverrides());
  const [row] = await db.update(sentences).set({
    reading: tokens,
    readingError: error,
  }).where(eq(sentences.id, id)).returning();
  return row ? toSentence(row) : null;
}

/**
 * Generate furigana for every sentence that still lacks it (rows created before furigana existed, or
 * where a prior attempt failed). Returns how many were filled and how many errored.
 */
export async function backfillFurigana(): Promise<{ updated: number;
  errors: number; }> {
  const overrides = await getFuriganaOverrides();
  const rows = await db
    .select({
      id: sentences.id,
      text: sentences.text,
    })
    .from(sentences)
    .where(isNull(sentences.reading));
  let updated = 0;
  let errors = 0;
  for (const row of rows) {
    const {
      tokens, error,
    } = await generateFurigana(row.text, overrides);
    if (error) {
      errors += 1;
      await db.update(sentences).set({
        readingError: error,
      }).where(eq(sentences.id, row.id));
      continue;
    }
    if (!tokens) continue;
    await db.update(sentences).set({
      reading: tokens,
      readingError: null,
    }).where(eq(sentences.id, row.id));
    updated += 1;
  }
  return {
    updated,
    errors,
  };
}

export async function deleteSentence(id: string): Promise<boolean> {
  const rows = await db.delete(sentences).where(eq(sentences.id, id)).returning({
    id: sentences.id,
  });
  return rows.length > 0;
}

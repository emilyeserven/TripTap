import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm";
import type {
  CreateSentenceInput,
  Sentence,
  SentenceKind,
  UpdateSentenceInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { sentenceImages, sentences, sentenceVocab, type SentenceRow } from "@/db/schema";
import {
  furiganaColumns,
  furiganaColumnsMany,
  generateFurigana,
  getFuriganaOverrides,
} from "@/services/furigana";
import { deleteMedia, getMedia, type StoredMedia } from "@/services/media";
import { toIso } from "@/services/rows";

/** Optional list filters; every one narrows, none is required. */
export interface SentenceFilters {
  /** Restrict to these kinds; omitted/empty = all kinds. */
  kinds?: SentenceKind[];
  /** Rows derived from this sentence (a practice card's outputs, a bank sentence's cards). */
  derivedFromId?: string;
  lessonId?: string;
  writingId?: string;
  captureId?: string;
  needsCorrection?: boolean;
  shadowingCandidate?: boolean;
}

/** Number of vocab items linked to one sentence. */
async function vocabCountFor(id: string): Promise<number> {
  const [row] = await db
    .select({
      n: count(),
    })
    .from(sentenceVocab)
    .where(eq(sentenceVocab.sentenceId, id));
  return Number(row?.n ?? 0);
}

/** Linked-vocab counts for a set of sentence ids, keyed by id (missing ids imply 0). */
async function vocabCountMap(ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({
      sentenceId: sentenceVocab.sentenceId,
      n: count(),
    })
    .from(sentenceVocab)
    .where(inArray(sentenceVocab.sentenceId, ids))
    .groupBy(sentenceVocab.sentenceId);
  return new Map(rows.map(r => [r.sentenceId, Number(r.n)]));
}

/** The set of sentence ids that have an inline screenshot (ids only — never the blob). */
async function imageIdSet(): Promise<Set<string>> {
  const rows = await db
    .select({
      id: sentenceImages.sentenceId,
    })
    .from(sentenceImages);
  return new Set(rows.map(r => r.id));
}

/** Whether one sentence has an inline screenshot. */
async function hasInlineImage(id: string): Promise<boolean> {
  const [row] = await db
    .select({
      id: sentenceImages.sentenceId,
    })
    .from(sentenceImages)
    .where(eq(sentenceImages.sentenceId, id));
  return Boolean(row);
}

/**
 * Map a DB row to the shared `Sentence` wire type. `vocabCount` and `inlineImage` (whether a
 * `sentence_images` row exists) are supplied by the caller; `hasImage` is true for either image
 * system — the object-storage key (Migaku) or the inline screenshot.
 */
export function toSentence(row: SentenceRow, vocabCount = 0, inlineImage = false): Sentence {
  return {
    id: row.id,
    kind: row.kind,
    text: row.text,
    translation: row.translation,
    reading: row.reading ?? null,
    readingError: row.readingError ?? null,
    language: row.language,
    source: row.source,
    sourceId: row.sourceId,
    page: row.page,
    captureId: row.captureId,
    derivedFromId: row.derivedFromId,
    notes: row.notes,
    tags: row.tags,
    terms: row.terms ?? null,
    shadowingCandidate: row.shadowingCandidate,
    needsCorrection: row.needsCorrection,
    correction: row.correction,
    writingId: row.writingId,
    lessonId: row.lessonId,
    actualMeaning: row.actualMeaning,
    explanation: row.explanation,
    incorrectGrammarTerms: row.incorrectGrammarTerms ?? null,
    reasons: row.reasons ?? null,
    marks: row.marks ?? null,
    readingNote: row.readingNote,
    target: row.target,
    targetKind: (row.targetKind as Sentence["targetKind"]) ?? null,
    comprehension: (row.comprehension as Sentence["comprehension"]) ?? null,
    guess: row.guess,
    literal: row.literal,
    register: row.register,
    nuance: row.nuance,
    words: row.words ?? null,
    grammar: row.grammar ?? null,
    passes: row.passes ?? null,
    hasAudio: row.audioKey != null,
    hasImage: row.imageKey != null || inlineImage,
    vocabCount,
    createdAt: toIso(row.createdAt),
  };
}

/** Map a set of rows to wire sentences, resolving vocab counts and inline images in two queries. */
async function toSentences(rows: SentenceRow[]): Promise<Sentence[]> {
  const [counts, withImages] = await Promise.all([
    vocabCountMap(rows.map(r => r.id)),
    imageIdSet(),
  ]);
  return rows.map(row => toSentence(row, counts.get(row.id) ?? 0, withImages.has(row.id)));
}

/** Drizzle insert shape for one sentence row, from the create input. */
function toInsert(input: CreateSentenceInput) {
  const kind = input.kind ?? "bank";
  return {
    kind,
    text: input.text,
    translation: input.translation ?? null,
    language: input.language,
    source: input.source ?? null,
    sourceId: input.sourceId ?? null,
    page: input.page ?? null,
    captureId: input.captureId ?? null,
    derivedFromId: input.derivedFromId ?? null,
    notes: input.notes ?? null,
    tags: input.tags ?? null,
    terms: input.terms ?? null,
    shadowingCandidate: input.shadowingCandidate ?? false,
    // Learner-produced text (mine/practice) starts as "needs review"; bank examples don't.
    needsCorrection: input.needsCorrection ?? kind !== "bank",
    correction: input.correction ?? null,
    writingId: input.writingId ?? null,
    lessonId: input.lessonId ?? null,
    actualMeaning: input.actualMeaning ?? null,
    explanation: input.explanation ?? null,
    incorrectGrammarTerms: input.incorrectGrammarTerms ?? null,
    reasons: input.reasons ?? null,
    marks: input.marks ?? null,
    readingNote: input.readingNote ?? null,
    target: input.target ?? null,
    targetKind: input.targetKind ?? null,
    comprehension: input.comprehension ?? null,
    guess: input.guess ?? null,
    literal: input.literal ?? null,
    register: input.register ?? null,
    nuance: input.nuance ?? null,
    words: input.words ?? null,
    grammar: input.grammar ?? null,
    passes: input.passes ?? null,
  };
}

/** Build the WHERE conditions for a filtered list. */
function filterConditions(filters: SentenceFilters) {
  const kinds = filters.kinds ?? [];
  return [
    kinds.length > 0 ? inArray(sentences.kind, kinds) : undefined,
    filters.derivedFromId ? eq(sentences.derivedFromId, filters.derivedFromId) : undefined,
    filters.lessonId ? eq(sentences.lessonId, filters.lessonId) : undefined,
    filters.writingId ? eq(sentences.writingId, filters.writingId) : undefined,
    filters.captureId ? eq(sentences.captureId, filters.captureId) : undefined,
    filters.needsCorrection !== undefined
      ? eq(sentences.needsCorrection, filters.needsCorrection)
      : undefined,
    filters.shadowingCandidate !== undefined
      ? eq(sentences.shadowingCandidate, filters.shadowingCandidate)
      : undefined,
  ].filter(c => c !== undefined);
}

/** List sentences, newest first, optionally narrowed by kind and the other filters. */
export async function listSentences(filters: SentenceFilters = {}): Promise<Sentence[]> {
  const conditions = filterConditions(filters);
  const rows = await db
    .select()
    .from(sentences)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(sentences.createdAt));
  return toSentences(rows);
}

export async function getSentence(id: string): Promise<Sentence | null> {
  const [row] = await db.select().from(sentences).where(eq(sentences.id, id));
  if (!row) return null;
  const [vocabCount, inlineImage] = await Promise.all([vocabCountFor(id), hasInlineImage(id)]);
  return toSentence(row, vocabCount, inlineImage);
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
  return toSentences(rows);
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
  const furigana = await furiganaColumns(input.text);
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(sentences).values({
      ...toInsert(input),
      ...furigana,
    }).returning();
    const links = linkRows(row.id, input.vocabIds);
    if (links.length > 0) await tx.insert(sentenceVocab).values(links);
    return toSentence(row, links.length);
  });
}

/** Create many sentences (and their vocab links) in a single transaction. */
export async function createSentencesMany(inputs: CreateSentenceInput[]): Promise<Sentence[]> {
  if (inputs.length === 0) return [];
  const furigana = await furiganaColumnsMany(inputs.map(i => i.text));
  return db.transaction(async (tx) => {
    const rows = await tx
      .insert(sentences)
      .values(inputs.map((input, i) => ({
        ...toInsert(input),
        ...furigana[i],
      })))
      .returning();
    const links = rows.flatMap((row, i) => linkRows(row.id, inputs[i].vocabIds));
    if (links.length > 0) await tx.insert(sentenceVocab).values(links);
    return rows.map((row, i) => toSentence(row, linkRows(row.id, inputs[i].vocabIds).length));
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
  if (!row) return null;
  const [vocabCount, inlineImage] = await Promise.all([vocabCountFor(id), hasInlineImage(id)]);
  return toSentence(row, vocabCount, inlineImage);
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
  await db.update(sentences).set({
    reading: tokens,
    readingError: error,
  }).where(eq(sentences.id, id));
  return getSentence(id);
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

/** Fetch a sentence's stored audio/image bytes from object storage, or null when it has none. */
export async function getSentenceMedia(
  id: string,
  which: "audio" | "image",
): Promise<StoredMedia | null> {
  const [row] = await db
    .select({
      audioKey: sentences.audioKey,
      audioMime: sentences.audioMime,
      imageKey: sentences.imageKey,
      imageMime: sentences.imageMime,
    })
    .from(sentences)
    .where(eq(sentences.id, id));
  if (!row) return null;
  const key = which === "audio" ? row.audioKey : row.imageKey;
  const mime = which === "audio" ? row.audioMime : row.imageMime;
  if (!key) return null;
  const media = await getMedia(key);
  return media
    ? {
      body: media.body,
      contentType: mime ?? media.contentType,
    }
    : null;
}

export async function deleteSentence(id: string): Promise<boolean> {
  const rows = await db.delete(sentences).where(eq(sentences.id, id)).returning({
    id: sentences.id,
    audioKey: sentences.audioKey,
    imageKey: sentences.imageKey,
  });
  if (rows.length === 0) return false;
  // Best-effort media cleanup so deleting a sentence doesn't orphan its blobs in object storage.
  // The inline `sentence_images` row cascades with the delete.
  await Promise.all([deleteMedia(rows[0].audioKey), deleteMedia(rows[0].imageKey)]);
  return true;
}

/* ── Inline screenshot (stored as bytea in the `sentence_images` side table) ─────────────────────── */

/**
 * Fetch a sentence's image for streaming: the object-storage image (Migaku-imported) when the row
 * has a key, otherwise the inline screenshot. Null when the sentence has neither.
 */
export async function getSentenceImage(
  id: string,
): Promise<{ image: Buffer;
  mime: string | null; } | null> {
  const stored = await getSentenceMedia(id, "image");
  if (stored) {
    return {
      image: stored.body,
      mime: stored.contentType ?? null,
    };
  }
  const [row] = await db
    .select({
      image: sentenceImages.image,
      imageMime: sentenceImages.imageMime,
    })
    .from(sentenceImages)
    .where(eq(sentenceImages.sentenceId, id));
  return row
    ? {
      image: row.image,
      mime: row.imageMime,
    }
    : null;
}

/**
 * Store (or replace) a sentence's inline screenshot. Returns false when the sentence doesn't exist,
 * so the route can 404 instead of orphaning an image row.
 */
export async function setSentenceImage(
  id: string,
  image: Buffer,
  mime: string | null,
): Promise<boolean> {
  const [sentence] = await db
    .select({
      id: sentences.id,
    })
    .from(sentences)
    .where(eq(sentences.id, id));
  if (!sentence) return false;
  await db
    .insert(sentenceImages)
    .values({
      sentenceId: id,
      image,
      imageMime: mime,
    })
    .onConflictDoUpdate({
      target: sentenceImages.sentenceId,
      set: {
        image,
        imageMime: mime,
      },
    });
  return true;
}

/**
 * Remove a sentence's inline screenshot. Returns whether a row was deleted — a key-based
 * (Migaku-imported) image is managed by that pipeline and is not touched here.
 */
export async function deleteSentenceImage(id: string): Promise<boolean> {
  const rows = await db
    .delete(sentenceImages)
    .where(eq(sentenceImages.sentenceId, id))
    .returning({
      id: sentenceImages.sentenceId,
    });
  return rows.length > 0;
}

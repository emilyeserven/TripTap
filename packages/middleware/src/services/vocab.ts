import { asc, desc, eq } from "drizzle-orm";
import type { CreateVocabInput, Sentence, UpdateVocabInput, Vocab } from "@sentence-bank/types";
import { db } from "@/db";
import { sentences, sentenceVocab, vocab, type VocabRow } from "@/db/schema";
import { toSentence } from "@/services/sentences";
import { deleteMedia, getMedia, type StoredMedia } from "@/services/media";

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
    hasAudio: row.audioKey != null,
    hasImage: row.imageKey != null,
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

/** Fetch a vocab item's stored audio/image bytes from object storage, or null when it has none. */
export async function getVocabMedia(
  id: string,
  which: "audio" | "image",
): Promise<StoredMedia | null> {
  const [row] = await db
    .select({
      audioKey: vocab.audioKey,
      audioMime: vocab.audioMime,
      imageKey: vocab.imageKey,
      imageMime: vocab.imageMime,
    })
    .from(vocab)
    .where(eq(vocab.id, id));
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

export async function deleteVocab(id: string): Promise<boolean> {
  const rows = await db.delete(vocab).where(eq(vocab.id, id)).returning({
    id: vocab.id,
    audioKey: vocab.audioKey,
    imageKey: vocab.imageKey,
  });
  if (rows.length === 0) return false;
  // Best-effort media cleanup so deleting a vocab item doesn't orphan its blobs in object storage.
  await Promise.all([deleteMedia(rows[0].audioKey), deleteMedia(rows[0].imageKey)]);
  return true;
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

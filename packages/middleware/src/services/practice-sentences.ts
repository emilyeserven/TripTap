import { desc, eq } from "drizzle-orm";
import type {
  CreatePracticeSentenceInput,
  PracticeSentence,
  UpdatePracticeSentenceInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { practiceSentenceImages, practiceSentences, type PracticeSentenceRow } from "@/db/schema";
import { furiganaColumns, furiganaColumnsMany, furiganaColumnsOnEdit } from "@/services/furigana";
import { toIso } from "@/services/rows";

/** Map a DB row to the shared `PracticeSentence` wire type. */
function toPracticeSentence(row: PracticeSentenceRow, hasImage: boolean): PracticeSentence {
  return {
    id: row.id,
    text: row.text,
    readingNote: row.readingNote,
    reading: row.reading ?? null,
    readingError: row.readingError ?? null,
    translation: row.translation,
    language: row.language,
    target: row.target,
    targetKind: (row.targetKind as PracticeSentence["targetKind"]) ?? null,
    comprehension: (row.comprehension as PracticeSentence["comprehension"]) ?? null,
    guess: row.guess,
    literal: row.literal,
    register: row.register,
    nuance: row.nuance,
    words: row.words ?? null,
    grammar: row.grammar ?? null,
    terms: row.terms ?? null,
    passes: row.passes ?? null,
    sourceId: row.sourceId,
    page: row.page,
    captureId: row.captureId,
    sentenceId: row.sentenceId,
    needsCorrection: row.needsCorrection,
    correction: row.correction,
    hasImage,
    createdAt: toIso(row.createdAt),
  };
}

/** The set of practice-sentence ids that have a context screenshot (ids only — never the blob). */
async function imageIdSet(): Promise<Set<string>> {
  const rows = await db
    .select({
      id: practiceSentenceImages.practiceSentenceId,
    })
    .from(practiceSentenceImages);
  return new Set(rows.map(r => r.id));
}

/** Whether one practice sentence has a context screenshot. */
async function sentenceHasImage(id: string): Promise<boolean> {
  const [row] = await db
    .select({
      id: practiceSentenceImages.practiceSentenceId,
    })
    .from(practiceSentenceImages)
    .where(eq(practiceSentenceImages.practiceSentenceId, id));
  return Boolean(row);
}

/** Drizzle insert shape for one practice-sentence row, from the create input. */
function toInsert(input: CreatePracticeSentenceInput) {
  return {
    text: input.text,
    readingNote: input.readingNote ?? null,
    translation: input.translation ?? null,
    language: input.language,
    target: input.target ?? null,
    targetKind: input.targetKind ?? null,
    comprehension: input.comprehension ?? null,
    guess: input.guess ?? null,
    literal: input.literal ?? null,
    register: input.register ?? null,
    nuance: input.nuance ?? null,
    words: input.words ?? null,
    grammar: input.grammar ?? null,
    terms: input.terms ?? null,
    passes: input.passes ?? null,
    sourceId: input.sourceId ?? null,
    page: input.page ?? null,
    captureId: input.captureId ?? null,
    sentenceId: input.sentenceId ?? null,
    // Practice sentences default to "needs review" unless the caller says otherwise.
    needsCorrection: input.needsCorrection ?? true,
    correction: input.correction ?? null,
  };
}

export async function listPracticeSentences(): Promise<PracticeSentence[]> {
  const [rows, withImages] = await Promise.all([
    db.select().from(practiceSentences).orderBy(desc(practiceSentences.createdAt)),
    imageIdSet(),
  ]);
  return rows.map(row => toPracticeSentence(row, withImages.has(row.id)));
}

export async function getPracticeSentence(id: string): Promise<PracticeSentence | null> {
  const [row] = await db.select().from(practiceSentences).where(eq(practiceSentences.id, id));
  if (!row) return null;
  return toPracticeSentence(row, await sentenceHasImage(id));
}

export async function createPracticeSentence(
  input: CreatePracticeSentenceInput,
): Promise<PracticeSentence> {
  // Generated the same way as a bank sentence, so practice cards render ruby like everything else.
  const [row] = await db.insert(practiceSentences).values({
    ...toInsert(input),
    ...(await furiganaColumns(input.text)),
  }).returning();
  // Freshly created — a screenshot is attached afterwards via the image upload endpoint.
  return toPracticeSentence(row, false);
}

/** Create many practice sentences in a single insert (used by the capture/sentence import flow). */
export async function createPracticeSentencesMany(
  inputs: CreatePracticeSentenceInput[],
): Promise<PracticeSentence[]> {
  if (inputs.length === 0) return [];
  const furigana = await furiganaColumnsMany(inputs.map(i => i.text));
  const rows = await db
    .insert(practiceSentences)
    .values(inputs.map((input, i) => ({
      ...toInsert(input),
      ...furigana[i],
    })))
    .returning();
  return rows.map(row => toPracticeSentence(row, false));
}

export async function updatePracticeSentence(
  id: string,
  input: UpdatePracticeSentenceInput,
): Promise<PracticeSentence | null> {
  const furigana = await furiganaColumnsOnEdit(input.text);
  const [row] = await db
    .update(practiceSentences)
    .set({
      ...input,
      ...furigana,
    })
    .where(eq(practiceSentences.id, id))
    .returning();
  if (!row) return null;
  return toPracticeSentence(row, await sentenceHasImage(id));
}

export async function deletePracticeSentence(id: string): Promise<boolean> {
  const rows = await db.delete(practiceSentences).where(eq(practiceSentences.id, id)).returning({
    id: practiceSentences.id,
  });
  return rows.length > 0;
}

/* ── Context screenshot (stored inline in a side table) ──────────────────────────────────────────── */

/** Fetch a practice sentence's context screenshot bytes, or null when it has none. */
export async function getPracticeSentenceImage(
  id: string,
): Promise<{ image: Buffer;
  mime: string | null; } | null> {
  const [row] = await db
    .select({
      image: practiceSentenceImages.image,
      imageMime: practiceSentenceImages.imageMime,
    })
    .from(practiceSentenceImages)
    .where(eq(practiceSentenceImages.practiceSentenceId, id));
  return row
    ? {
      image: row.image,
      mime: row.imageMime,
    }
    : null;
}

/**
 * Store (or replace) a practice sentence's context screenshot. Returns false when the sentence doesn't
 * exist, so the route can 404 instead of orphaning an image row.
 */
export async function setPracticeSentenceImage(
  id: string,
  image: Buffer,
  mime: string | null,
): Promise<boolean> {
  const [sentence] = await db
    .select({
      id: practiceSentences.id,
    })
    .from(practiceSentences)
    .where(eq(practiceSentences.id, id));
  if (!sentence) return false;
  await db
    .insert(practiceSentenceImages)
    .values({
      practiceSentenceId: id,
      image,
      imageMime: mime,
    })
    .onConflictDoUpdate({
      target: practiceSentenceImages.practiceSentenceId,
      set: {
        image,
        imageMime: mime,
      },
    });
  return true;
}

/** Remove a practice sentence's context screenshot. Returns whether a row was deleted. */
export async function deletePracticeSentenceImage(id: string): Promise<boolean> {
  const rows = await db
    .delete(practiceSentenceImages)
    .where(eq(practiceSentenceImages.practiceSentenceId, id))
    .returning({
      id: practiceSentenceImages.practiceSentenceId,
    });
  return rows.length > 0;
}

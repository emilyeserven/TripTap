import { desc, eq } from "drizzle-orm";
import type {
  CreatePracticeSentenceInput,
  PracticeSentence,
  UpdatePracticeSentenceInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { practiceSentences, type PracticeSentenceRow } from "@/db/schema";

/** Map a DB row to the shared `PracticeSentence` wire type. */
export function toPracticeSentence(row: PracticeSentenceRow): PracticeSentence {
  return {
    id: row.id,
    text: row.text,
    reading: row.reading,
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
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

/** Drizzle insert shape for one practice-sentence row, from the create input. */
function toInsert(input: CreatePracticeSentenceInput) {
  return {
    text: input.text,
    reading: input.reading ?? null,
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
  const rows = await db
    .select()
    .from(practiceSentences)
    .orderBy(desc(practiceSentences.createdAt));
  return rows.map(toPracticeSentence);
}

export async function getPracticeSentence(id: string): Promise<PracticeSentence | null> {
  const [row] = await db.select().from(practiceSentences).where(eq(practiceSentences.id, id));
  return row ? toPracticeSentence(row) : null;
}

export async function createPracticeSentence(
  input: CreatePracticeSentenceInput,
): Promise<PracticeSentence> {
  const [row] = await db.insert(practiceSentences).values(toInsert(input)).returning();
  return toPracticeSentence(row);
}

/** Create many practice sentences in a single insert (used by the capture/sentence import flow). */
export async function createPracticeSentencesMany(
  inputs: CreatePracticeSentenceInput[],
): Promise<PracticeSentence[]> {
  if (inputs.length === 0) return [];
  const rows = await db.insert(practiceSentences).values(inputs.map(toInsert)).returning();
  return rows.map(toPracticeSentence);
}

export async function updatePracticeSentence(
  id: string,
  input: UpdatePracticeSentenceInput,
): Promise<PracticeSentence | null> {
  const [row] = await db
    .update(practiceSentences)
    .set(input)
    .where(eq(practiceSentences.id, id))
    .returning();
  return row ? toPracticeSentence(row) : null;
}

export async function deletePracticeSentence(id: string): Promise<boolean> {
  const rows = await db.delete(practiceSentences).where(eq(practiceSentences.id, id)).returning({
    id: practiceSentences.id,
  });
  return rows.length > 0;
}

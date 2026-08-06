import { and, desc, eq } from "drizzle-orm";
import type {
  CreateMySentenceInput,
  MySentence,
  UpdateMySentenceInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { mySentences, type MySentenceRow } from "@/db/schema";
import { crudService } from "@/services/crud";
import { furiganaColumns, furiganaColumnsMany, furiganaColumnsOnEdit } from "@/services/furigana";
import { toIso } from "@/services/rows";

/** Map a DB row to the shared `MySentence` wire type. */
function toMySentence(row: MySentenceRow): MySentence {
  return {
    id: row.id,
    text: row.text,
    translation: row.translation,
    reading: row.reading ?? null,
    readingError: row.readingError ?? null,
    language: row.language,
    practiceSentenceId: row.practiceSentenceId,
    writingId: row.writingId,
    lessonId: row.lessonId,
    needsCorrection: row.needsCorrection,
    correction: row.correction,
    actualMeaning: row.actualMeaning,
    explanation: row.explanation,
    terms: row.terms ?? null,
    incorrectGrammarTerms: row.incorrectGrammarTerms ?? null,
    reasons: row.reasons ?? null,
    marks: row.marks ?? null,
    shadowingCandidate: row.shadowingCandidate,
    createdAt: toIso(row.createdAt),
  };
}

/** Drizzle insert shape for one my-sentence row, minus the generated furigana columns. */
function toColumns(input: CreateMySentenceInput) {
  return {
    text: input.text,
    translation: input.translation ?? null,
    language: input.language,
    practiceSentenceId: input.practiceSentenceId ?? null,
    writingId: input.writingId ?? null,
    lessonId: input.lessonId ?? null,
    needsCorrection: input.needsCorrection ?? true,
    correction: input.correction ?? null,
    actualMeaning: input.actualMeaning ?? null,
    explanation: input.explanation ?? null,
    terms: input.terms ?? null,
    incorrectGrammarTerms: input.incorrectGrammarTerms ?? null,
    reasons: input.reasons ?? null,
    marks: input.marks ?? null,
    shadowingCandidate: input.shadowingCandidate ?? false,
  };
}

// `my_sentences` has no `updated_at`; furigana is generated in the insert mapper, the same way a
// bank sentence does it — furigana is a property of Japanese text, not of one table.
const crud = crudService(mySentences, {
  toWire: toMySentence,
  toInsert: async (input: CreateMySentenceInput) => ({
    ...toColumns(input),
    ...(await furiganaColumns(input.text)),
  }),
  orderBy: [desc(mySentences.createdAt)],
  touchUpdatedAt: false,
});

/** List my-sentences, newest first; optionally scoped to one practice sentence and/or lesson. */
export function listMySentences(
  filters: { practiceSentenceId?: string;
    lessonId?: string; } = {},
): Promise<MySentence[]> {
  const conditions = [
    filters.practiceSentenceId
      ? eq(mySentences.practiceSentenceId, filters.practiceSentenceId)
      : undefined,
    filters.lessonId ? eq(mySentences.lessonId, filters.lessonId) : undefined,
  ].filter(c => c !== undefined);
  return crud.list(conditions.length > 0 ? and(...conditions) : undefined);
}

export const getMySentence = crud.get;
export const createMySentence = crud.create;
export const deleteMySentence = crud.remove;

/**
 * Create many my-sentences in a single insert (used by the bulk-paste import flow).
 *
 * Not `crud.createMany`: that would run the analyzer once per sentence, where `furiganaColumnsMany`
 * resolves the overrides once for the whole batch.
 */
export async function createMySentencesMany(
  inputs: CreateMySentenceInput[],
): Promise<MySentence[]> {
  if (inputs.length === 0) return [];
  const furigana = await furiganaColumnsMany(inputs.map(i => i.text));
  const rows = await db
    .insert(mySentences)
    .values(inputs.map((input, i) => ({
      ...toColumns(input),
      ...furigana[i],
    })))
    .returning();
  return rows.map(toMySentence);
}

export async function updateMySentence(
  id: string,
  input: UpdateMySentenceInput,
): Promise<MySentence | null> {
  const furigana = await furiganaColumnsOnEdit(input.text);
  const [row] = await db
    .update(mySentences)
    .set({
      ...input,
      ...furigana,
    })
    .where(eq(mySentences.id, id))
    .returning();
  return row ? toMySentence(row) : null;
}

import { asc, eq } from "drizzle-orm";
import type { Vocab } from "@sentence-bank/types";
import { db } from "@/db";
import { practiceSentences, practiceSentenceVocab, vocab } from "@/db/schema";
import { toVocab } from "@/services/vocab";

/** The vocab items linked to a practice sentence. */
export async function getVocabForPracticeSentence(practiceSentenceId: string): Promise<Vocab[]> {
  const rows = await db
    .select({
      v: vocab,
    })
    .from(practiceSentenceVocab)
    .innerJoin(vocab, eq(practiceSentenceVocab.vocabId, vocab.id))
    .where(eq(practiceSentenceVocab.practiceSentenceId, practiceSentenceId))
    .orderBy(asc(vocab.term));
  return rows.map(({
    v,
  }) => toVocab(v));
}

/**
 * Replace the full set of vocab links for a practice sentence. Returns null when the practice sentence
 * doesn't exist, otherwise the resulting linked vocab.
 */
export async function setVocabForPracticeSentence(
  practiceSentenceId: string,
  vocabIds: string[],
): Promise<Vocab[] | null> {
  const deduped = [...new Set(vocabIds.filter(Boolean))];
  const result = await db.transaction(async (tx) => {
    const [exists] = await tx
      .select({
        id: practiceSentences.id,
      })
      .from(practiceSentences)
      .where(eq(practiceSentences.id, practiceSentenceId));
    if (!exists) return null;
    await tx
      .delete(practiceSentenceVocab)
      .where(eq(practiceSentenceVocab.practiceSentenceId, practiceSentenceId));
    if (deduped.length > 0) {
      await tx.insert(practiceSentenceVocab).values(deduped.map(vocabId => ({
        practiceSentenceId,
        vocabId,
      })));
    }
    return true;
  });
  if (!result) return null;
  return getVocabForPracticeSentence(practiceSentenceId);
}

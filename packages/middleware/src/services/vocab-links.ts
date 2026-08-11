import { asc, eq } from "drizzle-orm";
import type { Vocab } from "@sentence-bank/types";

import { db } from "@/db";
import { sentences, sentenceVocab, vocab } from "@/db/schema";
import { toVocab } from "@/services/vocab";

/**
 * Vocab links for sentences. Pre-merge this was parameterized over two structurally identical join
 * tables (`sentence_vocab` + `practice_sentence_vocab`); the unified sentences table needs only the
 * one, so the descriptor machinery went with the second table.
 */

/** The vocab items linked to one sentence (any kind), by term. */
export async function getVocabForSentence(sentenceId: string): Promise<Vocab[]> {
  const rows = await db
    .select({
      v: vocab,
    })
    .from(sentenceVocab)
    .innerJoin(vocab, eq(sentenceVocab.vocabId, vocab.id))
    .where(eq(sentenceVocab.sentenceId, sentenceId))
    .orderBy(asc(vocab.term));
  return rows.map(({
    v,
  }) => toVocab(v));
}

/**
 * Replace the full set of vocab links for one sentence. Returns null when the sentence doesn't
 * exist, otherwise the resulting linked vocab.
 */
export async function setVocabForSentence(
  sentenceId: string,
  vocabIds: string[],
): Promise<Vocab[] | null> {
  const deduped = [...new Set(vocabIds.filter(Boolean))];
  const result = await db.transaction(async (tx) => {
    const [exists] = await tx
      .select({
        id: sentences.id,
      })
      .from(sentences)
      .where(eq(sentences.id, sentenceId));
    if (!exists) return null;
    await tx.delete(sentenceVocab).where(eq(sentenceVocab.sentenceId, sentenceId));
    if (deduped.length > 0) {
      await tx.insert(sentenceVocab).values(deduped.map(vocabId => ({
        sentenceId,
        vocabId,
      })));
    }
    return true;
  });
  if (!result) return null;
  return getVocabForSentence(sentenceId);
}

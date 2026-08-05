import { asc, eq } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import type { Vocab } from "@sentence-bank/types";

import { db } from "@/db";
import { practiceSentences, practiceSentenceVocab, sentences, sentenceVocab, vocab } from "@/db/schema";
import { toVocab } from "@/services/vocab";

/**
 * Vocab links for the two sentence-ish tables that have them.
 *
 * `sentence_vocab` and `practice_sentence_vocab` are structurally identical join tables — same
 * composite key, same cascade, differing only in which column names the parent — and their two
 * services were the same file twice over. One parameterized pair covers both, so a change to the
 * link semantics can't land on one side and miss the other.
 */
interface VocabLink {
  /** The join table. */
  joinTable: PgTable;
  /** The join table's FK back to the parent row. */
  parentColumn: AnyPgColumn;
  /** The join table's FK to `vocab`. */
  vocabColumn: AnyPgColumn;
  /** The parent table, for the existence check. */
  parentTable: PgTable;
  /** The parent table's id column. */
  parentIdColumn: AnyPgColumn;
  /** Property name the join table uses for the parent id, when inserting. */
  parentKey: string;
}

const SENTENCE_LINK: VocabLink = {
  joinTable: sentenceVocab,
  parentColumn: sentenceVocab.sentenceId,
  vocabColumn: sentenceVocab.vocabId,
  parentTable: sentences,
  parentIdColumn: sentences.id,
  parentKey: "sentenceId",
};

const PRACTICE_LINK: VocabLink = {
  joinTable: practiceSentenceVocab,
  parentColumn: practiceSentenceVocab.practiceSentenceId,
  vocabColumn: practiceSentenceVocab.vocabId,
  parentTable: practiceSentences,
  parentIdColumn: practiceSentences.id,
  parentKey: "practiceSentenceId",
};

/** The vocab items linked to one parent row, by term. */
async function getLinkedVocab(link: VocabLink, parentId: string): Promise<Vocab[]> {
  const rows = await db
    .select({
      v: vocab,
    })
    .from(link.joinTable)
    .innerJoin(vocab, eq(link.vocabColumn, vocab.id))
    .where(eq(link.parentColumn, parentId))
    .orderBy(asc(vocab.term));
  return rows.map(({
    v,
  }) => toVocab(v));
}

/**
 * Replace the full set of vocab links for one parent row. Returns null when the parent doesn't
 * exist, otherwise the resulting linked vocab.
 */
async function setLinkedVocab(
  link: VocabLink,
  parentId: string,
  vocabIds: string[],
): Promise<Vocab[] | null> {
  const deduped = [...new Set(vocabIds.filter(Boolean))];
  const result = await db.transaction(async (tx) => {
    const [exists] = await tx
      .select({
        id: link.parentIdColumn,
      })
      .from(link.parentTable)
      .where(eq(link.parentIdColumn, parentId));
    if (!exists) return null;
    await tx.delete(link.joinTable).where(eq(link.parentColumn, parentId));
    if (deduped.length > 0) {
      await tx.insert(link.joinTable).values(deduped.map(vocabId => ({
        [link.parentKey]: parentId,
        vocabId,
      })));
    }
    return true;
  });
  if (!result) return null;
  return getLinkedVocab(link, parentId);
}

/** The vocab items linked to a bank sentence. */
export function getVocabForSentence(sentenceId: string): Promise<Vocab[]> {
  return getLinkedVocab(SENTENCE_LINK, sentenceId);
}

/** Replace the full set of vocab links for a bank sentence. */
export function setVocabForSentence(
  sentenceId: string,
  vocabIds: string[],
): Promise<Vocab[] | null> {
  return setLinkedVocab(SENTENCE_LINK, sentenceId, vocabIds);
}

/** The vocab items linked to a practice sentence. */
export function getVocabForPracticeSentence(practiceSentenceId: string): Promise<Vocab[]> {
  return getLinkedVocab(PRACTICE_LINK, practiceSentenceId);
}

/** Replace the full set of vocab links for a practice sentence. */
export function setVocabForPracticeSentence(
  practiceSentenceId: string,
  vocabIds: string[],
): Promise<Vocab[] | null> {
  return setLinkedVocab(PRACTICE_LINK, practiceSentenceId, vocabIds);
}

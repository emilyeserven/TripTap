/**
 * Duplicate detection for imports. Used two ways: to flag candidates that already exist (a review
 * hint, matched on text across all languages) and to enforce dedup at commit (authoritative, scoped
 * to the target language). Matching is on trimmed text/term — exact, case-sensitive.
 */

import { eq } from "drizzle-orm";
import type { MigakuCandidateKind } from "@sentence-bank/types";
import { db } from "@/db";
import { sentences, vocab } from "@/db/schema";

export interface ExistingBankKeys {
  sentenceTexts: Set<string>;
  vocabTerms: Set<string>;
}

const norm = (value: string): string => value.trim();

/** Existing sentence texts + vocab terms across all languages, for the review "already exists" hint. */
export async function getExistingKeys(): Promise<ExistingBankKeys> {
  const [sentenceRows, vocabRows] = await Promise.all([
    db.select({
      text: sentences.text,
    }).from(sentences),
    db.select({
      term: vocab.term,
    }).from(vocab),
  ]);
  return {
    sentenceTexts: new Set(sentenceRows.map(r => norm(r.text))),
    vocabTerms: new Set(vocabRows.map(r => norm(r.term))),
  };
}

/** Existing texts/terms scoped to one language, for authoritative commit-time dedup. */
export async function getExistingKeysForLanguage(language: string): Promise<ExistingBankKeys> {
  const [sentenceRows, vocabRows] = await Promise.all([
    db.select({
      text: sentences.text,
    }).from(sentences).where(eq(sentences.language, language)),
    db.select({
      term: vocab.term,
    }).from(vocab).where(eq(vocab.language, language)),
  ]);
  return {
    sentenceTexts: new Set(sentenceRows.map(r => norm(r.text))),
    vocabTerms: new Set(vocabRows.map(r => norm(r.term))),
  };
}

/** Whether a candidate's text matches an existing bank row, per its (current) kind. */
export function candidateExists(
  kind: MigakuCandidateKind,
  text: string,
  keys: ExistingBankKeys,
): boolean {
  const t = norm(text);
  return kind === "sentence" ? keys.sentenceTexts.has(t) : keys.vocabTerms.has(t);
}

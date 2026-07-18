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

export interface ExistingBankIds {
  /** Existing sentence text → its row id (first row wins on collisions). */
  sentenceIds: Map<string, string>;
  /** Existing vocab term → its row id. */
  vocabIds: Map<string, string>;
}

/**
 * Existing sentence/vocab row ids keyed by trimmed text/term, scoped to one language. Used by the
 * Migaku commit to resolve a "link to existing" duplicate to the row it should link to.
 */
export async function getExistingIdsForLanguage(language: string): Promise<ExistingBankIds> {
  const [sentenceRows, vocabRows] = await Promise.all([
    db.select({
      id: sentences.id,
      text: sentences.text,
    }).from(sentences).where(eq(sentences.language, language)),
    db.select({
      id: vocab.id,
      term: vocab.term,
    }).from(vocab).where(eq(vocab.language, language)),
  ]);
  const sentenceIds = new Map<string, string>();
  for (const r of sentenceRows) if (!sentenceIds.has(norm(r.text))) sentenceIds.set(norm(r.text), r.id);
  const vocabIds = new Map<string, string>();
  for (const r of vocabRows) if (!vocabIds.has(norm(r.term))) vocabIds.set(norm(r.term), r.id);
  return {
    sentenceIds,
    vocabIds,
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

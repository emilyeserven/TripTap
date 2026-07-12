/**
 * Shared "Practice Sentence" domain types.
 *
 * A practice sentence is a study-aid record derived from the sentence-mining worksheet: one card per
 * sentence, richly broken down (target, guess, word/grammar notes, "my own sentence", study passes).
 * Unlike a bank {@link Sentence}, a practice sentence is typically imported from a capture or an
 * existing sentence, and is *not* professionally written — it carries a `needsCorrection` flag and an
 * (initially hidden) `correction` field. Consumed by both the Fastify API and the React client.
 */

// Type-only import (erased at build) — `SentenceTermRef` lives in the barrel; no runtime cycle.
import type { SentenceTermRef } from "./index.js";

/** One unknown word logged on a practice sentence: the word, its reading, and its meaning. */
export interface PracticeWord {
  /** The word/term, e.g. "頭". */
  w: string;
  /** Reading/pronunciation, e.g. "あたま". */
  r: string;
  /** Meaning in the user's language. */
  m: string;
}

/** One grammar point logged on a practice sentence: the pattern and what it does to the meaning. */
export interface PracticeGrammar {
  /** The pattern, e.g. "〜も〜ないし". */
  p: string;
  /** What it does, e.g. "stacks another complaint; し leaves the list open". */
  n: string;
}

/** The study passes tracked per practice sentence (the worksheet's checklist). */
export type PracticePassKey = "read" | "guess" | "lookup" | "produce" | "card";

/** Which study passes the learner has completed for a sentence. Absent key = not done. */
export type PracticePasses = Partial<Record<PracticePassKey, boolean>>;

/** What kind of thing the sentence's single "target" is. Validated at the route layer. */
export type PracticeTargetKind = "word" | "grammar" | "idiom" | "collocation" | "reading";

/**
 * How well the learner understands the sentence, à la Tofugu's curation gate: `ready` (~80%+ — good to
 * card into an SRS), `studying` (under 80% — study the component parts first), `skip` (under 50% — defer).
 */
export type PracticeComprehension = "ready" | "studying" | "skip";

/** A single practice sentence: a richly-annotated study card. */
export interface PracticeSentence {
  id: string;
  /** The sentence in the target language, copied exactly from the source. */
  text: string;
  /** Free-text reading of the tricky parts (worksheet-style, not generated furigana); null if none. */
  reading: string | null;
  /** Natural translation in the user's language; null until added. */
  translation: string | null;
  /** Target language, e.g. "Japanese". */
  language: string;
  /** The single thing this sentence is teaching (the one target); null if not set. */
  target: string | null;
  /** What kind of target it is; null if not set. */
  targetKind: PracticeTargetKind | null;
  /** How well the learner understands the sentence (Tofugu curation gate); null until assessed. */
  comprehension: PracticeComprehension | null;
  /** The learner's pre-lookup guess at the meaning; null if none. */
  guess: string | null;
  /** Literal/structural gloss, recorded only when the structure surprised the learner; null if none. */
  literal: string | null;
  /** Politeness/register label (free-text), e.g. "casual (タメ口)"; null if none. */
  register: string | null;
  /** Who says this, to whom, and what would be wrong instead; null if none. */
  nuance: string | null;
  /** Unknown words logged for study (never mined wholesale into a card); null if none. */
  words: PracticeWord[] | null;
  /** Grammar points logged for study; null if none. */
  grammar: PracticeGrammar[] | null;
  /** Structured tags from the bookmarks channels (Vocabulary / Grammar / General); null if none. */
  terms: SentenceTermRef[] | null;
  /** Completed study passes; null if none tracked yet. */
  passes: PracticePasses | null;
  /** The taxonomy source this sentence came from (copied from its origin), or null. */
  sourceId: string | null;
  /** Per-sentence location within the source, e.g. "42", "p. 12–13". */
  page: string | null;
  /** The capture this was imported from, or null. */
  captureId: string | null;
  /** The bank sentence this was imported from, or null. */
  sentenceId: string | null;
  /** Whether this sentence is known to need correction (starts true — not professionally written). */
  needsCorrection: boolean;
  /** A corrected version of {@link text}, stored but not yet displayed (follow-up feature); null until added. */
  correction: string | null;
  /** ISO-8601 timestamp of when the practice sentence was added. */
  createdAt: string;
}

/** Payload for creating a practice sentence. Only `text` + `language` are required. */
export interface CreatePracticeSentenceInput {
  text: string;
  language: string;
  reading?: string | null;
  translation?: string | null;
  target?: string | null;
  targetKind?: PracticeTargetKind | null;
  comprehension?: PracticeComprehension | null;
  guess?: string | null;
  literal?: string | null;
  register?: string | null;
  nuance?: string | null;
  words?: PracticeWord[] | null;
  grammar?: PracticeGrammar[] | null;
  terms?: SentenceTermRef[] | null;
  passes?: PracticePasses | null;
  sourceId?: string | null;
  page?: string | null;
  captureId?: string | null;
  sentenceId?: string | null;
  /** Defaults to true server-side when omitted. */
  needsCorrection?: boolean;
  correction?: string | null;
}

/** Payload for partially updating a practice sentence. */
export type UpdatePracticeSentenceInput = Partial<CreatePracticeSentenceInput>;

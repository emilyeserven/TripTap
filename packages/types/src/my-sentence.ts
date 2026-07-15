/**
 * Shared "My Sentence" domain types.
 *
 * A my-sentence is a sentence the learner produced themselves — either the "Output" step of the
 * practice worksheet (same pattern, their own life) or a standalone entry (e.g. a sentence they got
 * wrong in a tutoring lesson). Like a {@link PracticeSentence} it is *not* professionally written: it
 * starts flagged `needsCorrection`, with a nullable `correction` filled in later. It may link back to
 * the practice sentence it was produced from. Consumed by both the Fastify API and the React client.
 */

// Type-only import (erased at build) — `SentenceTermRef` lives in the barrel; no runtime cycle.
import type { DrillMistakeReasonRef } from "./drill-session.js";
import type { SentenceTermRef } from "./index.js";
import type { SentenceMark } from "./sentence-mark.js";

/** A learner-produced sentence, awaiting correction. */
export interface MySentence {
  id: string;
  /** The sentence the learner wrote. */
  text: string;
  /** The intended meaning — what the learner meant to say; null if none. */
  translation: string | null;
  /** Target language, e.g. "Japanese". */
  language: string;
  /** The practice sentence this was produced from, or null. */
  practiceSentenceId: string | null;
  /** The writing this sentence was promoted from (via a correction), or null. */
  writingId: string | null;
  /** The tutoring lesson this sentence was added from, or null. */
  lessonId: string | null;
  /** Whether it still needs correction (starts true — not professionally written). */
  needsCorrection: boolean;
  /** A corrected version of {@link text}, filled in later; null until corrected. */
  correction: string | null;
  /** What the sentence as written actually says — the mismatch with {@link translation}; null if none. */
  actualMeaning: string | null;
  /** A prose note explaining the correction; null if none. */
  explanation: string | null;
  /** Structured bookmarks tags (Vocabulary / Grammar / General); null until any are attached. */
  terms: SentenceTermRef[] | null;
  /** Why it was wrong — references into the shared Drill reason taxonomy; null until any are tagged. */
  reasons: DrillMistakeReasonRef[] | null;
  /** Learner-marked correct/incorrect spans of `text` (offsets into the original); null if none. */
  marks: SentenceMark[] | null;
  /** ISO-8601 timestamp of when the sentence was added. */
  createdAt: string;
}

/** Payload for creating a my-sentence. Only `text` + `language` are required. */
export interface CreateMySentenceInput {
  text: string;
  language: string;
  translation?: string | null;
  practiceSentenceId?: string | null;
  writingId?: string | null;
  lessonId?: string | null;
  /** Defaults to true server-side when omitted. */
  needsCorrection?: boolean;
  correction?: string | null;
  actualMeaning?: string | null;
  explanation?: string | null;
  terms?: SentenceTermRef[] | null;
  reasons?: DrillMistakeReasonRef[] | null;
  marks?: SentenceMark[] | null;
}

/** Payload for partially updating a my-sentence. */
export type UpdateMySentenceInput = Partial<CreateMySentenceInput>;

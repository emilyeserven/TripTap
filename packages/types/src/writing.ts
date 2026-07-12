/**
 * Shared "My Writing" domain types.
 *
 * A writing is a free-form block the learner wrote themselves — a paragraph, a journal entry, or a
 * handful of sentences — with an optional intended meaning and comments, the vocab/grammar/general
 * terms they were targeting, and a "ready to review" flag. In a correction pass each sentence can be
 * corrected and "officially added" to My Sentences; those corrections are recorded inline. Consumed by
 * both the Fastify API and the React client.
 */

import type { SentenceTermRef } from "./index.js";

/**
 * One corrected sentence within a writing. Created client-side (`id` via `crypto.randomUUID()`); once
 * "officially added" to My Sentences, `mySentenceId` points at the created row.
 */
export interface WritingCorrection {
  /** Stable client-generated id for this correction. */
  id: string;
  /** The sentence as originally written (the segment the `+` was clicked after). */
  original: string;
  /** The corrected version of {@link original}. */
  corrected: string;
  /** An optional explanation of the correction; null if none. */
  note: string | null;
  /** The My Sentence created from this correction, or null if not yet promoted. */
  mySentenceId: string | null;
}

/** A free-form writing entry. */
export interface Writing {
  id: string;
  /** The free-write body — may hold multiple sentences and line breaks. */
  text: string;
  /** What the learner intended to say; null if none. */
  meaning: string | null;
  /** Additional comments/notes; null if none. */
  comments: string | null;
  /** Target language, e.g. "Japanese". */
  language: string;
  /** Whether the learner has flagged this ready for review. */
  readyToReview: boolean;
  /** The vocab/grammar/general terms this writing was targeting; null if none. */
  terms: SentenceTermRef[] | null;
  /** Inline corrections made against this writing; null if none. */
  corrections: WritingCorrection[] | null;
  /** Title of the writing prompt this entry was started from; null if freeform. */
  promptTitle: string | null;
  /** Body of the writing prompt this entry was started from; null if freeform. */
  promptText: string | null;
  /** ISO-8601 timestamp of when the writing was created. */
  createdAt: string;
  /** ISO-8601 timestamp of the last update (bumped on every save). */
  updatedAt: string;
}

/** Payload for creating a writing. Only `text` + `language` are required. */
export interface CreateWritingInput {
  text: string;
  language: string;
  meaning?: string | null;
  comments?: string | null;
  /** Defaults to false server-side when omitted. */
  readyToReview?: boolean;
  terms?: SentenceTermRef[] | null;
  corrections?: WritingCorrection[] | null;
  /** Title of the writing prompt this entry was started from; null/omitted if freeform. */
  promptTitle?: string | null;
  /** Body of the writing prompt this entry was started from; null/omitted if freeform. */
  promptText?: string | null;
}

/** Payload for partially updating a writing. */
export type UpdateWritingInput = Partial<CreateWritingInput>;

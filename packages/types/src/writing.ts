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
import type { SentenceMark } from "./sentence-mark.js";

import { z } from "zod";

import { isoDateString, objectJsonSchema } from "./json-schema.js";
import { sentenceMarkSchema } from "./sentence-mark.js";
import { termsListSchema } from "./terms.js";

/**
 * One corrected sentence within a writing. Created client-side (`id` via `crypto.randomUUID()`); once
 * "officially added" to My Sentences, `mySentenceId` points at the created row.
 */
export interface WritingCorrection {
  /** Stable client-generated id for this correction. */
  id: string;
  /** The sentence as originally written (the segment the `+` was clicked after). */
  original: string;
  /**
   * The corrected version of {@link original}, derived from the track-changes editor.
   *
   * An **empty string means "reviewed, no change needed"** — the sentence was already right, and
   * the entry exists only to record that (and to carry a {@link note}). Read it through the
   * client's `correctedText()` helper rather than bare, or a no-change entry reads as a blank
   * sentence.
   */
  corrected: string;
  /**
   * An optional explanation of the correction; null if none. A line shaped `phrase: note`, where
   * the phrase occurs in the corrected sentence, attaches that note to that phrase in the UI.
   */
  note: string | null;
  /** Track-changes spans over {@link corrected} (offsets into it); null if none. */
  marks: SentenceMark[] | null;
  /** The My Sentence created from this correction, or null if not yet promoted. */
  mySentenceId: string | null;
}

/** A free-form writing entry. */
export interface Writing {
  id: string;
  /**
   * Optional learner-given name for the entry; null if unnamed. The UI falls back to {@link date}
   * so every writing still lists under a readable label instead of a slab of its own body text.
   */
  title: string | null;
  /** ISO date (YYYY-MM-DD) the writing was worked on, for grouping activity by day. */
  date: string;
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

/** Payload for creating a writing. `text`, `language`, and `date` are required. */
const writingCorrectionSchema = z.object({
  id: z.string(),
  original: z.string(),
  corrected: z.string(),
  note: z.string().nullable().optional(),
  marks: z.array(sentenceMarkSchema).nullable().optional(),
  mySentenceId: z.string().nullable().optional(),
});

export const createWritingSchema = z.object({
  text: z.string(),
  language: z.string().min(1),
  /** ISO date (YYYY-MM-DD) the writing was worked on. */
  date: isoDateString(),
  /** Optional name for the entry; null/omitted falls back to the date in the UI. */
  title: z.string().nullable().optional(),
  meaning: z.string().nullable().optional(),
  comments: z.string().nullable().optional(),
  /** Defaults to false server-side when omitted. */
  readyToReview: z.boolean().optional(),
  terms: termsListSchema.optional(),
  corrections: z.array(writingCorrectionSchema).nullable().optional(),
  /** Title of the writing prompt this entry was started from; null/omitted if freeform. */
  promptTitle: z.string().nullable().optional(),
  /** Body of the writing prompt this entry was started from; null/omitted if freeform. */
  promptText: z.string().nullable().optional(),
});

/** JSON Schema (draft-07) for the create payload, used verbatim as the route body. */
export const createWritingJsonSchema = objectJsonSchema(createWritingSchema);

/**
 * `corrections` is overridden rather than inferred: the route requires only `id`, `original` and
 * `corrected` on an entry, while {@link WritingCorrection} declares `note`, `marks` and
 * `mySentenceId` too (nullable, but present). Inferring would loosen the stored type across every
 * reader; narrowing the schema would reject partial corrections the API accepts today. Same call as
 * `CreateAnswerSheetInput.entries`.
 */
export type CreateWritingInput = Omit<z.infer<typeof createWritingSchema>, "corrections"> & {
  corrections?: WritingCorrection[] | null;
};

/** Payload for partially updating a writing. */
export type UpdateWritingInput = Partial<CreateWritingInput>;

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
import type { FuriToken, SentenceTermRef } from "./index.js";
import type { SentenceMark } from "./sentence-mark.js";

import { z } from "zod";

import { drillMistakeReasonRefSchema } from "./drill-session.js";
import { objectJsonSchema } from "./json-schema.js";
import { sentenceMarkSchema } from "./sentence-mark.js";
import { termsListSchema } from "./terms.js";

/** A learner-produced sentence, awaiting correction. */
export interface MySentence {
  id: string;
  /** The sentence the learner wrote. */
  text: string;
  /** The intended meaning — what the learner meant to say; null if none. */
  translation: string | null;
  /** Target language, e.g. "Japanese". */
  /** Auto-generated furigana segmentation of {@link text}; null until generated. */
  reading: FuriToken[] | null;
  /** Why furigana generation failed, when it did; null on success. */
  readingError: string | null;
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
  /**
   * Grammar-source tags this sentence used **incorrectly** — distinct from the neutral grammar tags in
   * {@link terms}. Surfaced on the grammar note under "Used incorrectly here". Null until any are tagged.
   */
  incorrectGrammarTerms: SentenceTermRef[] | null;
  /** Why it was wrong — references into the shared Drill reason taxonomy; null until any are tagged. */
  reasons: DrillMistakeReasonRef[] | null;
  /** Learner-marked correct/incorrect spans of `text` (offsets into the original); null if none. */
  marks: SentenceMark[] | null;
  /** Marked by the learner as a good sentence to shadow (practise aloud). */
  shadowingCandidate: boolean;
  /** ISO-8601 timestamp of when the sentence was added. */
  createdAt: string;
}

/** Payload for creating a my-sentence. Only `text` + `language` are required. */
export const createMySentenceSchema = z.object({
  text: z.string().min(1),
  language: z.string().min(1),
  translation: z.string().nullable().optional(),
  practiceSentenceId: z.guid().nullable().optional(),
  writingId: z.guid().nullable().optional(),
  lessonId: z.guid().nullable().optional(),
  /** Defaults to true server-side when omitted. */
  needsCorrection: z.boolean().optional(),
  correction: z.string().nullable().optional(),
  actualMeaning: z.string().nullable().optional(),
  explanation: z.string().nullable().optional(),
  terms: termsListSchema.optional(),
  incorrectGrammarTerms: termsListSchema.optional(),
  reasons: z.array(drillMistakeReasonRefSchema).nullable().optional(),
  marks: z.array(sentenceMarkSchema).nullable().optional(),
  shadowingCandidate: z.boolean().optional(),
});

/** JSON Schema (draft-07) for the create payload, used verbatim as the route body. */
export const createMySentenceJsonSchema = objectJsonSchema(createMySentenceSchema);

export type CreateMySentenceInput = z.infer<typeof createMySentenceSchema>;

/** Payload for partially updating a my-sentence. */
export type UpdateMySentenceInput = Partial<CreateMySentenceInput>;

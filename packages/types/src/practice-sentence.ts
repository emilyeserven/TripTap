/**
 * Legacy "Practice Sentence" wire contract.
 *
 * Practice sentences are now `kind: "practice"` rows of the unified {@link Sentence} (see
 * `sentence.ts`, which also owns the shared helper types — `PracticeWord`, `PracticePasses`, …).
 * This module keeps the pre-merge wire shape alive for the legacy `/api/practice-sentences/*`
 * wrapper routes and the not-yet-migrated client, and is deleted once both are gone.
 */

// Type-only import (erased at build) — `SentenceTermRef` lives in the barrel; no runtime cycle.
import type { FuriToken, SentenceTermRef } from "./index.js";
import type {
  PracticeComprehension,
  PracticeGrammar,
  PracticePasses,
  PracticeTargetKind,
  PracticeWord,
} from "./sentence.js";

import { z } from "zod";

import { objectJsonSchema } from "./json-schema.js";
import {
  practiceGrammarSchema,
  practicePassesSchema,
  practiceWordSchema,
} from "./sentence.js";
import { termsListSchema } from "./terms.js";

/** A single practice sentence: a richly-annotated study card. */
export interface PracticeSentence {
  id: string;
  /** The sentence in the target language, copied exactly from the source. */
  text: string;
  /** The learner's own note on how to read the tricky parts (worksheet-style); null if none. */
  readingNote: string | null;
  /** Auto-generated furigana segmentation of {@link text}; null until generated. */
  reading: FuriToken[] | null;
  /** Why furigana generation failed, when it did; null on success. */
  readingError: string | null;
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
  /** True when a context screenshot is attached (served at `/api/practice-sentences/:id/image`). */
  hasImage: boolean;
  /** ISO-8601 timestamp of when the practice sentence was added. */
  createdAt: string;
}

/** Payload for creating a practice sentence. Only `text` + `language` are required. */
export const createPracticeSentenceSchema = z.object({
  text: z.string().min(1),
  language: z.string().min(1),
  readingNote: z.string().nullable().optional(),
  translation: z.string().nullable().optional(),
  target: z.string().nullable().optional(),
  targetKind: z.enum(["word", "grammar", "idiom", "collocation", "reading"]).nullable().optional(),
  comprehension: z.enum(["ready", "studying", "skip"]).nullable().optional(),
  guess: z.string().nullable().optional(),
  literal: z.string().nullable().optional(),
  register: z.string().nullable().optional(),
  nuance: z.string().nullable().optional(),
  words: z.array(practiceWordSchema).nullable().optional(),
  grammar: z.array(practiceGrammarSchema).nullable().optional(),
  terms: termsListSchema.optional(),
  passes: practicePassesSchema.optional(),
  sourceId: z.guid().nullable().optional(),
  page: z.string().nullable().optional(),
  captureId: z.guid().nullable().optional(),
  sentenceId: z.guid().nullable().optional(),
  /** Defaults to true server-side when omitted. */
  needsCorrection: z.boolean().optional(),
  correction: z.string().nullable().optional(),
});

/** JSON Schema (draft-07) for the create payload, used verbatim as the route body. */
export const createPracticeSentenceJsonSchema = objectJsonSchema(createPracticeSentenceSchema);

export type CreatePracticeSentenceInput = z.infer<typeof createPracticeSentenceSchema>;

/** Payload for partially updating a practice sentence. */
export type UpdatePracticeSentenceInput = Partial<CreatePracticeSentenceInput>;

/* ── Breakdown import (paste an AI's sentence breakdown as JSON) ──────────────────────────────────── */

// The import contract now lives in `sentence.ts`; these aliases keep the legacy names alive.
export {
  sentenceImportJsonSchema as practiceSentenceImportJsonSchema,
  sentenceImportSchema as practiceSentenceImportSchema,
} from "./sentence.js";

/** The pasted breakdown payload. */
export type { SentenceImportInput as PracticeSentenceImportInput } from "./sentence.js";

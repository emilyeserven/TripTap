/**
 * The unified Sentence — one wire contract for every sentence in the app.
 *
 * The bank, My Sentences, and Practice used to be three tables with three contracts; they are now one
 * `sentences` table discriminated by {@link SentenceKind}. A row's kind says what the sentence *is for*
 * ("reference example" / "I wrote this" / "I'm studying this"), and each kind lights up a facet of
 * optional fields — but every column is available to every kind, so nothing is ever dropped when a
 * sentence moves between roles. Consumed by both the Fastify API and the React client.
 */

// Type-only import (erased at build) — `SentenceTermRef` lives in the barrel; no runtime cycle.
import type { DrillMistakeReasonRef } from "./drill-session.js";
import type { FuriToken, SentenceTermRef } from "./index.js";
import type { SentenceMark } from "./sentence-mark.js";

import { z } from "zod";

import { drillMistakeReasonRefSchema } from "./drill-session.js";
import { furiTokenSchema } from "./furigana.js";
import { fieldJsonSchema, objectJsonSchema } from "./json-schema.js";
import { sentenceMarkSchema } from "./sentence-mark.js";
import { termsListSchema } from "./terms.js";

/* ── Kind ─────────────────────────────────────────────────────────────────────────────────────── */

/**
 * What role a sentence plays: a bank reference example, a sentence the learner wrote (`mine`), or a
 * study card being worked through (`practice`).
 */
export type SentenceKind = "bank" | "mine" | "practice";

/** Every kind, in the order they should be offered. */
export const SENTENCE_KINDS: readonly SentenceKind[] = ["bank", "mine", "practice"] as const;

/** Zod schema for a sentence kind (route validation + client parsing). */
export const sentenceKindSchema = z.enum(["bank", "mine", "practice"]);

/** Human copy for a kind — the picker's label and the one-line explanation under it. */
export const SENTENCE_KIND_INFO: Record<SentenceKind, {
  label: string;
  description: string;
}> = {
  bank: {
    label: "Sentence bank",
    description: "Reference examples to study and export.",
  },
  mine: {
    label: "My Sentences",
    description: "Sentences you wrote, queued for correction.",
  },
  practice: {
    label: "Practice",
    description: "Study cards with passes and a breakdown.",
  },
};

/* ── Practice-facet helper types ──────────────────────────────────────────────────────────────── */

/** One unknown word logged on a practice-kind sentence: the word, its reading, and its meaning. */
export interface PracticeWord {
  /** The word/term, e.g. "頭". */
  w: string;
  /** Reading/pronunciation, e.g. "あたま". */
  r: string;
  /** Meaning in the user's language. */
  m: string;
}

/** One grammar point logged on a practice-kind sentence: the pattern and what it does. */
export interface PracticeGrammar {
  /** The pattern, e.g. "〜も〜ないし". */
  p: string;
  /** What it does, e.g. "stacks another complaint; し leaves the list open". */
  n: string;
}

/** The study passes tracked per practice-kind sentence (the worksheet's checklist). */
export type PracticePassKey = "read" | "guess" | "lookup" | "produce" | "card";

/**
 * Which study passes the learner has completed for a sentence. Absent key = not done. A string value
 * is the ISO timestamp of completion (dates the pass's XP grant); legacy `true` means completed at an
 * unknown time, which XP dates by the sentence's `createdAt`.
 */
export type PracticePasses = Partial<Record<PracticePassKey, boolean | string>>;

/** What kind of thing a practice sentence's single "target" is. */
export type PracticeTargetKind = "word" | "grammar" | "idiom" | "collocation" | "reading";

/**
 * How well the learner understands the sentence, à la Tofugu's curation gate: `ready` (~80%+ — good to
 * card into an SRS), `studying` (under 80% — study the component parts first), `skip` (under 50% — defer).
 */
export type PracticeComprehension = "ready" | "studying" | "skip";

/** Zod schema for one logged unknown word ({@link PracticeWord}). */
export const practiceWordSchema = z.object({
  w: z.string(),
  r: z.string(),
  m: z.string(),
});

/** Zod schema for one logged grammar point ({@link PracticeGrammar}). */
export const practiceGrammarSchema = z.object({
  p: z.string(),
  n: z.string(),
});

// A pass value is either a legacy boolean or the ISO timestamp of completion (see PracticePasses).
const passValueSchema = z.union([z.boolean(), z.string()]).optional();

/** Zod schema for the study-pass checklist ({@link PracticePasses}). */
export const practicePassesSchema = z.object({
  read: passValueSchema,
  guess: passValueSchema,
  lookup: passValueSchema,
  produce: passValueSchema,
  card: passValueSchema,
}).nullable();

/** Zod schema for {@link PracticeTargetKind}. */
export const practiceTargetKindSchema = z.enum([
  "word",
  "grammar",
  "idiom",
  "collocation",
  "reading",
]);

/** Zod schema for {@link PracticeComprehension}. */
export const practiceComprehensionSchema = z.enum(["ready", "studying", "skip"]);

/* ── The sentence itself ──────────────────────────────────────────────────────────────────────── */

/**
 * A single sentence. The core (text/reading/translation/provenance) applies to every kind; the
 * correction pair, mine facet, and practice facet are nullable and simply unused where they don't
 * apply. Derived fields (`hasAudio`/`hasImage`/`vocabCount`) are computed server-side on read.
 */
export interface Sentence {
  id: string;
  /** What role this sentence plays; see {@link SentenceKind}. */
  kind: SentenceKind;
  /** The sentence in the target language, e.g. "毎朝コーヒーを飲みます。". */
  text: string;
  /**
   * Furigana segmentation of {@link text}, auto-generated server-side; null until generated (or for
   * non-Japanese text). Rendered as ruby when the furigana toggle is on.
   */
  reading: FuriToken[] | null;
  /** Message from the last failed furigana generation, or null when it succeeded. */
  readingError: string | null;
  /**
   * The meaning in the user's own language. For mine-kind rows this is the *intended* meaning — what
   * the learner meant to say (contrast {@link actualMeaning}). Null when not yet translated.
   */
  translation: string | null;
  /** Target language, e.g. "Japanese". */
  language: string;

  /* Provenance — where the sentence came from. */
  /** Legacy free-text origin, kept for rows predating the source taxonomy. */
  source: string | null;
  /** The taxonomy source this sentence belongs to, or null. */
  sourceId: string | null;
  /** Per-sentence location within the source, e.g. "42", "p. 12–13". */
  page: string | null;
  /** The capture this sentence was mined from, or null. */
  captureId: string | null;
  /**
   * The sentence this one was derived from, or null: a practice card points at the bank sentence it
   * was mined from; a mine-kind sentence points at the practice card whose "Output" step produced it;
   * a bank row promoted from My Sentences points back at the original. The target's {@link kind}
   * disambiguates.
   */
  derivedFromId: string | null;

  /** Optional free-form notes. */
  notes: string | null;
  /** Optional comma-separated free-text tags (distinct from structured {@link terms}). */
  tags: string | null;
  /**
   * Structured tags borrowed from the external bookmarks taxonomy. Denormalized (id + name +
   * provenance) so display never needs a live bookmarks call. Null when none are attached.
   */
  terms: SentenceTermRef[] | null;

  /** Marked by the learner as a good sentence to shadow (practise aloud). */
  shadowingCandidate: boolean;

  /* Correction pair — defaults on create: false for bank, true for mine/practice. */
  /** Whether it still needs correction (learner-produced text starts true). */
  needsCorrection: boolean;
  /** A corrected version of {@link text}, filled in later; null until corrected. */
  correction: string | null;

  /* Mine facet — sentences the learner wrote. */
  /** The writing this sentence was promoted from (via a correction), or null. */
  writingId: string | null;
  /** The tutoring lesson this sentence was added from, or null. */
  lessonId: string | null;
  /** What the sentence as written actually says — the mismatch with {@link translation}; null if none. */
  actualMeaning: string | null;
  /** A prose note explaining the correction; null if none. */
  explanation: string | null;
  /**
   * Grammar-source tags this sentence used **incorrectly** — distinct from the neutral grammar tags in
   * {@link terms}. Surfaced on the grammar note under "Used incorrectly here". Null until any are tagged.
   */
  incorrectGrammarTerms: SentenceTermRef[] | null;
  /** Why it was wrong — references into the shared Drill reason taxonomy; null until any are tagged. */
  reasons: DrillMistakeReasonRef[] | null;
  /** Learner-marked correct/incorrect spans of `text` (offsets into the original); null if none. */
  marks: SentenceMark[] | null;

  /* Practice facet — the study-card worksheet. */
  /** The learner's own note on how to read the tricky parts (worksheet-style); null if none. */
  readingNote: string | null;
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
  /** Completed study passes; null if none tracked yet. */
  passes: PracticePasses | null;

  /* Derived on read. */
  /** True when an audio clip is stored for this sentence (fetch from `/api/sentences/:id/audio`). */
  hasAudio: boolean;
  /** True when an image is stored for this sentence (fetch from `/api/sentences/:id/image`). */
  hasImage: boolean;
  /** How many vocab items are linked to this sentence (drives the "Break it down" affordance). */
  vocabCount: number;

  /** ISO-8601 timestamp of when the sentence was added. */
  createdAt: string;
}

/**
 * Payload for creating a sentence. Only `text` + `language` are required; `kind` defaults to `"bank"`
 * server-side, and `needsCorrection` defaults by kind (false for bank, true for mine/practice).
 */
export const createSentenceSchema = z.object({
  text: z.string().min(1),
  language: z.string().min(1),
  kind: sentenceKindSchema.optional(),
  translation: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  sourceId: z.guid().nullable().optional(),
  page: z.string().nullable().optional(),
  captureId: z.guid().nullable().optional(),
  derivedFromId: z.guid().nullable().optional(),
  notes: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  /** Structured taxonomy terms borrowed from the bookmarks app; see {@link SentenceTermRef}. */
  terms: termsListSchema.optional(),
  /** Vocab items to link to this sentence (many-to-many). */
  vocabIds: z.array(z.guid()).optional(),
  shadowingCandidate: z.boolean().optional(),
  needsCorrection: z.boolean().optional(),
  correction: z.string().nullable().optional(),
  // Mine facet.
  writingId: z.guid().nullable().optional(),
  lessonId: z.guid().nullable().optional(),
  actualMeaning: z.string().nullable().optional(),
  explanation: z.string().nullable().optional(),
  incorrectGrammarTerms: termsListSchema.optional(),
  reasons: z.array(drillMistakeReasonRefSchema).nullable().optional(),
  marks: z.array(sentenceMarkSchema).nullable().optional(),
  // Practice facet.
  readingNote: z.string().nullable().optional(),
  target: z.string().nullable().optional(),
  targetKind: practiceTargetKindSchema.nullable().optional(),
  comprehension: practiceComprehensionSchema.nullable().optional(),
  guess: z.string().nullable().optional(),
  literal: z.string().nullable().optional(),
  register: z.string().nullable().optional(),
  nuance: z.string().nullable().optional(),
  words: z.array(practiceWordSchema).nullable().optional(),
  grammar: z.array(practiceGrammarSchema).nullable().optional(),
  passes: practicePassesSchema.optional(),
});

/** JSON Schema (draft-07) for the create payload, used verbatim as the route body. */
export const createSentenceJsonSchema = objectJsonSchema(createSentenceSchema);

/** JSON Schema (draft-07) for a manual furigana override — the sentence PATCH body's `reading`. */
export const sentenceReadingJsonSchema = fieldJsonSchema(z.array(furiTokenSchema).nullable());

export type CreateSentenceInput = z.infer<typeof createSentenceSchema>;

/** Payload for partially updating a sentence. `reading` is a manual furigana override (null clears it). */
export type UpdateSentenceInput = Partial<CreateSentenceInput> & {
  reading?: FuriToken[] | null;
};

/* ── Breakdown import (paste an AI's sentence breakdown as JSON) ──────────────────────────────── */

/**
 * The JSON an external AI emits when it breaks down one sentence, pasted into the app to create a
 * practice-kind sentence. A Zod schema (strict, so stray keys are rejected) is the single source of
 * truth: the client validates the paste with `safeParse`, and the route body uses the derived JSON
 * Schema, so the two can never drift — mirroring the AI-lesson import contract.
 */
export const sentenceImportSchema = z.strictObject({
  /** The sentence in the target language, copied exactly. */
  text: z.string().min(1),
  /** Target language; defaults to "Japanese" on import when omitted. */
  language: z.string().optional(),
  /** The learner's own note on how to read the tricky parts (not generated furigana). */
  readingNote: z.string().optional().nullable(),
  /** Natural translation. */
  translation: z.string().optional().nullable(),
  /** The single thing this sentence teaches. */
  target: z.string().optional().nullable(),
  targetKind: z.enum(["word", "grammar", "idiom", "collocation", "reading"]).optional().nullable(),
  /** Pre-lookup guess at the meaning. */
  guess: z.string().optional().nullable(),
  /** Literal/structural gloss. */
  literal: z.string().optional().nullable(),
  /** Politeness/register label. */
  register: z.string().optional().nullable(),
  /** Who says this, to whom. */
  nuance: z.string().optional().nullable(),
  /** Unknown words: word / reading / meaning. */
  words: z.array(z.strictObject({
    w: z.string().min(1),
    r: z.string(),
    m: z.string(),
  })).optional().nullable(),
  /** Grammar points: pattern / what it does. */
  grammar: z.array(z.strictObject({
    p: z.string().min(1),
    n: z.string(),
  })).optional().nullable(),
});

/** JSON Schema (draft-07) derived from the Zod contract, used verbatim as the import route's body. */
export const sentenceImportJsonSchema = z.toJSONSchema(sentenceImportSchema, {
  target: "draft-7",
});

/** The pasted breakdown payload. */
export type SentenceImportInput = z.infer<typeof sentenceImportSchema>;

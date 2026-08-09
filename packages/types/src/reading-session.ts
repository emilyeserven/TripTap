/**
 * Shared "Reading Session" domain types.
 *
 * A reading session records the learner working through a passage: where it came from, a translation
 * done either as one freeform block or line-by-line, an optional whole-passage summary (a literal
 * translation isn't always worth it), per-line correction notes, and a flat list of words the learner
 * was shaky on or didn't know — each optionally flagged to add to a flashcard list later. Consumed by
 * both the Fastify API and the React client.
 */

import type { SentenceTermRef } from "./index.js";
import type { BookmarkRef, SessionXp, SessionXpInput } from "./session.js";

import { z } from "zod";

import { isoDateString, nonNegativeInt, objectJsonSchema } from "./json-schema.js";
import { bookmarkRefWriteFields, learningAreaField } from "./session.js";
import { termsListSchema } from "./terms.js";

/** How the learner recorded meaning for the whole session. */
export type ReadingTranslationMode = "freeform" | "line-by-line" | "summary";

/** The learner's self-assessment of how a translation went, against the reference translation. */
export type TranslationVerdict = "correct" | "partial" | "incorrect";

/**
 * How hard the reading felt, a modifier on the session's earned XP: very-easy ×0.25, easy ×0.5,
 * medium ×1 (the default), hard ×1.25. Null (legacy/unset) scores as medium.
 */
export type ReadingDifficulty = "very-easy" | "easy" | "medium" | "hard";

/** How confident the learner was on a noted word: shaky on it, or didn't know it at all. */
export type WordNoteStatus = "shaky" | "unknown";

/** One line of a line-by-line reading. */
export interface ReadingLine {
  /** Stable client-generated id (via `newId()`). */
  id: string;
  /** The original line in the target language (one entry per pasted newline). */
  text: string;
  /** The learner's rendering of this line — a literal translation, or a summary when `summaryOnly`. */
  translation: string | null;
  /** When true this line was summarised, not translated literally. */
  summaryOnly: boolean;
  /** The reference ("correct") translation for this line, entered on the edit page. */
  correction: string | null;
  /** A freeform comment on this line's translation (why it was off, a note). */
  note: string | null;
  /** The learner's self-assessment of their translation against the reference; null when unassessed. */
  verdict: TranslationVerdict | null;
  /** Flags this line as having a translation the learner wants to revisit/correct. */
  needsCorrection: boolean;
  /** Grammar-source tags for this line (the grammar points it exercises); null when untagged. */
  grammarTerms: SentenceTermRef[] | null;
}

/** One flagged word encountered while reading. */
export interface WordNote {
  /** Stable client-generated id (via `newId()`). */
  id: string;
  /** The word/phrase as it appeared. */
  word: string;
  /** Optional reading/pronunciation, e.g. kana. */
  reading: string | null;
  /** Optional gloss / meaning the learner looked up. */
  meaning: string | null;
  /** Was the learner shaky on it, or did they not know it at all? */
  status: WordNoteStatus;
  /** Marker to add this to a flashcard list later; no vocab is auto-created. */
  flashcard: boolean;
  /**
   * ISO-8601 timestamp of when a flashcard was actually made from this note (marked by hand or
   * stamped by an export); null until then. Older rows without the field read as null.
   */
  flashcardMadeAt: string | null;
  /**
   * The id of the My Sentence the learner wrote from this word (via "Make a sentence"), or null.
   * A word note only earns Reading XP once this is set — making a sentence is the way to bank the word.
   */
  mySentenceId: string | null;
}

/** A reading session. */
export interface ReadingSession extends SessionXp, BookmarkRef {
  id: string;
  /** ISO date (YYYY-MM-DD) the session happened, for grouping activity by day. */
  date: string;
  title: string;
  /** Target language, e.g. "Japanese". */
  language: string;
  /** The taxonomy source this reading came from, or null. */
  sourceId: string | null;
  /** Location within the source, e.g. "42", "p. 12–13", "ch. 3". */
  page: string | null;
  /** Which translation workflow this session uses. */
  mode: ReadingTranslationMode;
  /** How hard the reading felt — a modifier on earned XP; null (unset) scores as medium. */
  difficulty: ReadingDifficulty | null;
  /**
   * Passive session: the learner just read (no translation or notes) for {@link timeSpentMinutes}
   * minutes. A passive session earns XP per minute; an active one earns XP from its translations and
   * banked words. Either way the total is scaled by {@link difficulty}.
   */
  passive: boolean;
  /** Minutes read, for a passive session's per-minute XP (then scaled by difficulty). 0 when active. */
  timeSpentMinutes: number;
  /** The original text being read; in line-by-line mode this is what gets split into `lines`. */
  passage: string | null;
  /** The whole-passage translation, used in "freeform" mode. */
  freeformTranslation: string | null;
  /** The reference ("correct") translation for the freeform translation, entered on the edit page. */
  freeformCorrection: string | null;
  /** A freeform comment on the freeform translation. */
  freeformNote: string | null;
  /** The learner's self-assessment of the freeform translation; null when unassessed. */
  freeformVerdict: TranslationVerdict | null;
  /** A summary of the whole passage, when a literal translation isn't warranted. */
  summary: string | null;
  /** The per-line breakdown, used in "line-by-line" mode; null otherwise. */
  lines: ReadingLine[] | null;
  /** Words the learner was shaky on / didn't know, with flashcard markers; null if none. */
  wordNotes: WordNote[] | null;
  /** ISO-8601 timestamp of when the session was created. */
  createdAt: string;
  /** ISO-8601 timestamp of the last update. */
  updatedAt: string;
}

const lineSchema = z.object({
  id: z.string(),
  text: z.string(),
  translation: z.string().nullable().optional(),
  summaryOnly: z.boolean(),
  correction: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  verdict: z.enum(["correct", "partial", "incorrect"]).nullable().optional(),
  needsCorrection: z.boolean(),
  grammarTerms: termsListSchema.optional(),
});

const wordNoteSchema = z.object({
  id: z.string(),
  word: z.string(),
  reading: z.string().nullable().optional(),
  meaning: z.string().nullable().optional(),
  status: z.enum(["shaky", "unknown"]),
  flashcard: z.boolean(),
  flashcardMadeAt: z.string().nullable().optional(),
  mySentenceId: z.string().nullable().optional(),
});

/** Payload for creating a reading session. `title`, `language`, and `date` are required. */
export const createReadingSessionSchema = z.object({
  title: z.string().min(1),
  language: z.string().min(1),
  /** ISO date (YYYY-MM-DD) the session happened. */
  date: isoDateString(),
  sourceId: z.string().nullable().optional(),
  page: z.string().nullable().optional(),
  mode: z.enum(["freeform", "line-by-line", "summary"]).optional(),
  difficulty: z.enum(["very-easy", "easy", "medium", "hard"]).nullable().optional(),
  passive: z.boolean().optional(),
  timeSpentMinutes: nonNegativeInt().optional(),
  passage: z.string().nullable().optional(),
  freeformTranslation: z.string().nullable().optional(),
  freeformCorrection: z.string().nullable().optional(),
  freeformNote: z.string().nullable().optional(),
  freeformVerdict: z.enum(["correct", "partial", "incorrect"]).nullable().optional(),
  summary: z.string().nullable().optional(),
  lines: z.array(lineSchema).nullable().optional(),
  wordNotes: z.array(wordNoteSchema).nullable().optional(),
  ...bookmarkRefWriteFields,
  learningArea: learningAreaField(),
  countsTowardXp: z.boolean().optional(),
});

/** JSON Schema (draft-07) for the create payload, used verbatim as the route body. */
export const createReadingSessionJsonSchema = objectJsonSchema(createReadingSessionSchema);

/**
 * Payload for creating a reading session.
 *
 * `lines` and `wordNotes` are overridden rather than inferred: the route requires only the
 * identifying and boolean fields on an entry, while {@link ReadingLine} / {@link WordNote} declare
 * the rest present-but-nullable. See {@link bookmarkRefWriteFields} on the bookmark `Omit`.
 */
export type CreateReadingSessionInput
  = Omit<
    z.infer<typeof createReadingSessionSchema>,
    keyof BookmarkRef | keyof SessionXpInput | "lines" | "wordNotes"
  > & Partial<BookmarkRef> & SessionXpInput & {
    lines?: ReadingLine[] | null;
    wordNotes?: WordNote[] | null;
  };

/** Payload for partially updating a reading session. */
export type UpdateReadingSessionInput = Partial<CreateReadingSessionInput>;

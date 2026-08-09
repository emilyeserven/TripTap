/**
 * Shared "Lesson" domain types.
 *
 * A lesson records what happened in a tutoring session: a date, a single associated tutor, a running
 * log of listening notes (kana-capable, no timestamps), a flat list of word notes (borrowed from
 * Reading Sessions, but with every field optional), and links to the answer sheets worked through.
 * Consumed by both the Fastify API and the React client.
 */

import type { WordNoteStatus } from "./reading-session.js";
import type { SessionXp, SessionXpInput } from "./session.js";

import { z } from "zod";

import { isoDateString, nonNegativeInt, objectJsonSchema } from "./json-schema.js";
import { LEARNING_AREAS } from "./question-sheet.js";

/**
 * One note logged while listening during a lesson. Unlike a listening-session entry there's no
 * timestamp — just the note and optional untranslated English context kept out of any kana conversion.
 */
export interface LessonListeningNote {
  /** Stable client-generated id (via `newId()`). */
  id: string;
  /** The note body. In kana-only entry mode this holds the converted kana. */
  text: string;
  /** Optional untranslated English context, kept as-is (never converted to kana). */
  context?: string | null;
}

/**
 * One word noted during a lesson. Every field is optional — sometimes only the meaning is known, or
 * only a reading to look up later — but a note is kept only if at least one of `word`, `reading`,
 * `meaning`, or `notes` is filled. `reading` is entered kana-only.
 */
export interface LessonWordNote {
  /** Stable client-generated id (via `newId()`). */
  id: string;
  /** The word/phrase, if known. */
  word: string | null;
  /** Optional reading/pronunciation, kana-only. */
  reading: string | null;
  /** Optional gloss / meaning. */
  meaning: string | null;
  /** Freeform notes about the word. */
  notes: string | null;
  /** Was the learner shaky on it, or did they not know it at all? */
  status: WordNoteStatus;
  /** Marker to add this to a flashcard list later; no vocab is auto-created. */
  flashcard: boolean;
  /**
   * ISO-8601 timestamp of when a flashcard was actually made from this note (marked by hand or
   * stamped by an export); null until then. Older rows without the field read as null.
   */
  flashcardMadeAt: string | null;
}

/** A tutoring lesson. */
export interface Lesson extends SessionXp {
  id: string;
  /** Optional title; the UI falls back to a date-based label when absent. */
  title: string | null;
  /** The date the lesson took place, as "YYYY-MM-DD". */
  date: string;
  /** Target language, e.g. "Japanese". */
  language: string;
  /** The associated tutor's id, or null. */
  tutorId: string | null;
  /** General free-text notes (Markdown), shown above the listening notes; null if none. */
  notes: string | null;
  /** Notes logged while listening; null if none. */
  listeningNotes: LessonListeningNote[] | null;
  /** Words noted during the lesson; null if none. */
  wordNotes: LessonWordNote[] | null;
  /** Ids of answer sheets worked through in this lesson; null if none. */
  answerSheetIds: string[] | null;
  /** How long the tutoring session ran, in minutes; earns per-minute XP across several areas. 0 when unset. */
  durationMinutes: number;
  /** ISO-8601 timestamp of when the lesson was created. */
  createdAt: string;
  /** ISO-8601 timestamp of the last update. */
  updatedAt: string;
}

const listeningNoteSchema = z.object({
  id: z.string(),
  text: z.string(),
  context: z.string().nullable().optional(),
});

const wordNoteSchema = z.object({
  id: z.string(),
  word: z.string().nullable(),
  reading: z.string().nullable(),
  meaning: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.enum(["shaky", "unknown"]),
  flashcard: z.boolean(),
  flashcardMadeAt: z.string().nullable().optional(),
});

/** Payload for creating a lesson. Only `date` is required. */
export const createLessonSchema = z.object({
  /** The date the lesson took place, as "YYYY-MM-DD". */
  date: isoDateString(),
  language: z.string().optional(),
  title: z.string().nullable().optional(),
  tutorId: z.guid().nullable().optional(),
  notes: z.string().nullable().optional(),
  listeningNotes: z.array(listeningNoteSchema).nullable().optional(),
  wordNotes: z.array(wordNoteSchema).nullable().optional(),
  answerSheetIds: z.array(z.guid()).nullable().optional(),
  durationMinutes: nonNegativeInt().optional(),
  learningArea: z.enum(LEARNING_AREAS).nullable().optional(),
  countsTowardXp: z.boolean().optional(),
});

/** JSON Schema (draft-07) for the create payload, used verbatim as the route body. */
export const createLessonJsonSchema = objectJsonSchema(createLessonSchema);

/**
 * `listeningNotes` is overridden rather than inferred: the route requires only `id` and `text` on an
 * entry, while {@link LessonListeningNote} also declares `context`. Inferring would loosen the stored
 * type for every reader; narrowing the schema would reject entries the API accepts today.
 *
 * `SessionXpInput` is still extended for the two XP fields so the shared session contract stays the
 * one declaration of what "how this counts" means.
 */
export type CreateLessonInput = Omit<
  z.infer<typeof createLessonSchema>,
  "listeningNotes" | "learningArea" | "countsTowardXp"
> & SessionXpInput & {
  listeningNotes?: LessonListeningNote[] | null;
};

/** Payload for partially updating a lesson. */
export type UpdateLessonInput = Partial<CreateLessonInput>;

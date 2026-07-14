/**
 * Shared "Lesson" domain types.
 *
 * A lesson records what happened in a tutoring session: a date, a single associated tutor, a running
 * log of listening notes (kana-capable, no timestamps), a flat list of word notes (borrowed from
 * Reading Sessions, but with every field optional), and links to the answer sheets worked through.
 * Consumed by both the Fastify API and the React client.
 */

import type { WordNoteStatus } from "./reading-session.js";

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
}

/** A tutoring lesson. */
export interface Lesson {
  id: string;
  /** Optional title; the UI falls back to a date-based label when absent. */
  title: string | null;
  /** The date the lesson took place, as "YYYY-MM-DD". */
  date: string;
  /** Target language, e.g. "Japanese". */
  language: string;
  /** The associated tutor's id, or null. */
  tutorId: string | null;
  /** Notes logged while listening; null if none. */
  listeningNotes: LessonListeningNote[] | null;
  /** Words noted during the lesson; null if none. */
  wordNotes: LessonWordNote[] | null;
  /** Ids of answer sheets worked through in this lesson; null if none. */
  answerSheetIds: string[] | null;
  /** ISO-8601 timestamp of when the lesson was created. */
  createdAt: string;
  /** ISO-8601 timestamp of the last update. */
  updatedAt: string;
}

/** Payload for creating a lesson. Only `date` is required. */
export interface CreateLessonInput {
  date: string;
  language?: string;
  title?: string | null;
  tutorId?: string | null;
  listeningNotes?: LessonListeningNote[] | null;
  wordNotes?: LessonWordNote[] | null;
  answerSheetIds?: string[] | null;
}

/** Payload for partially updating a lesson. */
export type UpdateLessonInput = Partial<CreateLessonInput>;

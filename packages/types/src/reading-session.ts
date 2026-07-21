/**
 * Shared "Reading Session" domain types.
 *
 * A reading session records the learner working through a passage: where it came from, a translation
 * done either as one freeform block or line-by-line, an optional whole-passage summary (a literal
 * translation isn't always worth it), per-line correction notes, and a flat list of words the learner
 * was shaky on or didn't know — each optionally flagged to add to a flashcard list later. Consumed by
 * both the Fastify API and the React client.
 */

/** How the learner recorded meaning for the whole session. */
export type ReadingTranslationMode = "freeform" | "line-by-line";

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
  /** A correction to this line's translation, recorded later. */
  correction: string | null;
  /** Flags this line as having a translation the learner wants to revisit/correct. */
  needsCorrection: boolean;
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
}

/** A reading session. */
export interface ReadingSession {
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
  /** The original text being read; in line-by-line mode this is what gets split into `lines`. */
  passage: string | null;
  /** The whole-passage translation, used in "freeform" mode. */
  freeformTranslation: string | null;
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

/** Payload for creating a reading session. `title`, `language`, and `date` are required. */
export interface CreateReadingSessionInput {
  title: string;
  language: string;
  /** ISO date (YYYY-MM-DD) the session happened. */
  date: string;
  sourceId?: string | null;
  page?: string | null;
  mode?: ReadingTranslationMode;
  passage?: string | null;
  freeformTranslation?: string | null;
  summary?: string | null;
  lines?: ReadingLine[] | null;
  wordNotes?: WordNote[] | null;
}

/** Payload for partially updating a reading session. */
export type UpdateReadingSessionInput = Partial<CreateReadingSessionInput>;

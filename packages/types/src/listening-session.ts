/**
 * Shared "Listen and Shadow" domain types.
 *
 * A listening session pairs a YouTube video (usually one of the learner's bookmarks) with a running
 * log of timestamped notes: while the video plays, the learner types notes and each is stamped with
 * the playback position. A manual stopwatch is the fallback when a video can't be embedded/read.
 * Consumed by both the Fastify API and the React client.
 */

import type { SentenceTermRef } from "./index.js";
import type { BookmarkRef, SessionXp, SessionXpInput } from "./session.js";

import { z } from "zod";

import { isoDateString, nonNegativeInt, objectJsonSchema } from "./json-schema.js";
import { bookmarkRefWriteFields, learningAreaField } from "./session.js";
import { termsListSchema } from "./terms.js";

/**
 * One timestamped note within a session. `timestampMs` is the playback (or stopwatch) position in
 * whole milliseconds. `mode` records whether the stamp was taken when the learner started typing or
 * when they submitted; `source` records whether it came from the video or the stopwatch fallback.
 */
export interface ListeningEntry {
  /** Stable client-generated id for this note (via `crypto.randomUUID()`). */
  id: string;
  /** The note body. In kana-only entry mode this holds the converted kana prompt. */
  text: string;
  /**
   * Optional untranslated English context attached to a kana-only prompt, kept out of the kana
   * conversion so the learner can note meaning/hints without it becoming kana. Absent on older notes.
   */
  context?: string;
  /** Playback/stopwatch position when the note was stamped, in milliseconds. */
  timestampMs: number;
  /** Whether the stamp was captured at typing-start or at submit. */
  mode: "typing-start" | "submit";
  /** Whether the timestamp came from the video player or the stopwatch fallback. */
  source: "video" | "stopwatch";
}

/** A listen-and-shadow session. */
export interface ListeningSession extends SessionXp, BookmarkRef {
  id: string;
  /** ISO date (YYYY-MM-DD) the session happened, for grouping activity by day. */
  date: string;
  title: string;
  /** The YouTube URL played for this session; null when not yet set. */
  videoUrl: string | null;
  /** Target language, e.g. "Japanese". */
  language: string;
  /** The timestamped notes taken during the session; null if none. */
  entries: ListeningEntry[] | null;
  /**
   * Passive listening: the learner just listened (no note-taking) for {@link durationMinutes} minutes.
   * A passive session earns XP by the minute; a normal (active) session earns XP per timestamped note.
   */
  passive: boolean;
  /** Minutes listened, for a passive session's per-minute XP. 0 for active sessions. */
  durationMinutes: number;
  /** Borrowed bookmark terms tagging this session; null if none. */
  terms: SentenceTermRef[] | null;
  /** ISO-8601 timestamp of when the session was created. */
  createdAt: string;
  /** ISO-8601 timestamp of the last update. */
  updatedAt: string;
}

/** One timestamped note, as a route body accepts it — shared with shadowing sessions. */
export const listeningEntrySchema = z.object({
  id: z.string(),
  text: z.string(),
  context: z.string().optional(),
  timestampMs: z.number().min(0),
  mode: z.enum(["typing-start", "submit"]),
  source: z.enum(["video", "stopwatch"]),
});

/** Payload for creating a listening session. `title`, `language`, and `date` are required. */
export const createListeningSessionSchema = z.object({
  title: z.string().min(1),
  language: z.string().min(1),
  /** ISO date (YYYY-MM-DD) the session happened. */
  date: isoDateString(),
  videoUrl: z.string().nullable().optional(),
  ...bookmarkRefWriteFields,
  entries: z.array(listeningEntrySchema).nullable().optional(),
  passive: z.boolean().optional(),
  durationMinutes: nonNegativeInt().optional(),
  terms: termsListSchema.optional(),
  learningArea: learningAreaField(),
  countsTowardXp: z.boolean().optional(),
});

/** JSON Schema (draft-07) for the create payload, used verbatim as the route body. */
export const createListeningSessionJsonSchema = objectJsonSchema(createListeningSessionSchema);

/** Payload for creating a listening session — see {@link bookmarkRefWriteFields} on the `Omit`. */
export type CreateListeningSessionInput
  = Omit<z.infer<typeof createListeningSessionSchema>, keyof BookmarkRef | keyof SessionXpInput>
    & Partial<BookmarkRef> & SessionXpInput;

/** Payload for partially updating a listening session. */
export type UpdateListeningSessionInput = Partial<CreateListeningSessionInput>;

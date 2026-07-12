/**
 * Shared "Listen and Shadow" domain types.
 *
 * A listening session pairs a YouTube video (usually one of the learner's bookmarks) with a running
 * log of timestamped notes: while the video plays, the learner types notes and each is stamped with
 * the playback position. A manual stopwatch is the fallback when a video can't be embedded/read.
 * Consumed by both the Fastify API and the React client.
 */

import type { SentenceTermRef } from "./index.js";

/**
 * One timestamped note within a session. `timestampMs` is the playback (or stopwatch) position in
 * whole milliseconds. `mode` records whether the stamp was taken when the learner started typing or
 * when they submitted; `source` records whether it came from the video or the stopwatch fallback.
 */
export interface ListeningEntry {
  /** Stable client-generated id for this note (via `crypto.randomUUID()`). */
  id: string;
  text: string;
  /** Playback/stopwatch position when the note was stamped, in milliseconds. */
  timestampMs: number;
  /** Whether the stamp was captured at typing-start or at submit. */
  mode: "typing-start" | "submit";
  /** Whether the timestamp came from the video player or the stopwatch fallback. */
  source: "video" | "stopwatch";
}

/** A listen-and-shadow session. */
export interface ListeningSession {
  id: string;
  title: string;
  /** The YouTube URL played for this session; null when not yet set. */
  videoUrl: string | null;
  /** Target language, e.g. "Japanese". */
  language: string;
  /** The associated bookmark's id in the external bookmarks app, or null. */
  bookmarkId: string | null;
  /** The associated bookmark's title captured at selection time, or null. */
  bookmarkTitle: string | null;
  /** The associated bookmark's URL captured at selection time, or null. */
  bookmarkUrl: string | null;
  /** The timestamped notes taken during the session; null if none. */
  entries: ListeningEntry[] | null;
  /** Borrowed bookmark terms tagging this session; null if none. */
  terms: SentenceTermRef[] | null;
  /** ISO-8601 timestamp of when the session was created. */
  createdAt: string;
  /** ISO-8601 timestamp of the last update. */
  updatedAt: string;
}

/** Payload for creating a listening session. Only `title` + `language` are required. */
export interface CreateListeningSessionInput {
  title: string;
  language: string;
  videoUrl?: string | null;
  bookmarkId?: string | null;
  bookmarkTitle?: string | null;
  bookmarkUrl?: string | null;
  entries?: ListeningEntry[] | null;
  terms?: SentenceTermRef[] | null;
}

/** Payload for partially updating a listening session. */
export type UpdateListeningSessionInput = Partial<CreateListeningSessionInput>;

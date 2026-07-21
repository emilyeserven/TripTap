/**
 * Shared "Listen and Shadow" domain types.
 *
 * A listening session pairs a YouTube video (usually one of the learner's bookmarks) with a running
 * log of timestamped notes: while the video plays, the learner types notes and each is stamped with
 * the playback position. A manual stopwatch is the fallback when a video can't be embedded/read.
 * Consumed by both the Fastify API and the React client.
 */

import type { BookmarkSectionRef, SentenceTermRef } from "./index.js";

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
export interface ListeningSession {
  id: string;
  /** ISO date (YYYY-MM-DD) the session happened, for grouping activity by day. */
  date: string;
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
  /** The specific section of {@link bookmarkId} this session focuses on; null when none. */
  section: BookmarkSectionRef | null;
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

/** Payload for creating a listening session. `title`, `language`, and `date` are required. */
export interface CreateListeningSessionInput {
  title: string;
  language: string;
  /** ISO date (YYYY-MM-DD) the session happened. */
  date: string;
  videoUrl?: string | null;
  bookmarkId?: string | null;
  bookmarkTitle?: string | null;
  bookmarkUrl?: string | null;
  section?: BookmarkSectionRef | null;
  entries?: ListeningEntry[] | null;
  passive?: boolean;
  durationMinutes?: number;
  terms?: SentenceTermRef[] | null;
}

/** Payload for partially updating a listening session. */
export type UpdateListeningSessionInput = Partial<CreateListeningSessionInput>;

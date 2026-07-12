/**
 * Shared "Shadowing" domain types.
 *
 * A shadowing session pairs a YouTube video with a list of practice segments. Each segment is a
 * start/end slice of the video that the player loops automatically — a configurable number of times,
 * with an optional silent gap between reps — before auto-advancing to the next segment. Per-segment
 * `maxReplays`/`gapMs` override the session-level defaults. Sessions also carry the same timestamped
 * notes as a listening session. Consumed by both the Fastify API and the React client.
 */

import type { SentenceTermRef } from "./index.js";
import type { ListeningEntry } from "./listening-session.js";

/** One looped practice segment of the video. `startMs`/`endMs` are playback positions in ms. */
export interface ShadowingSegment {
  /** Stable client-generated id for this segment (via `crypto.randomUUID()`). */
  id: string;
  /** Display label; null when unnamed. */
  label: string | null;
  startMs: number;
  endMs: number;
  /** How many times to loop this segment before advancing; null → use the session default. */
  maxReplays: number | null;
  /** Silent gap between reps in ms; null → use the session default. */
  gapMs: number | null;
}

/** A shadowing practice session. */
export interface ShadowingSession {
  id: string;
  title: string;
  videoUrl: string | null;
  language: string;
  bookmarkId: string | null;
  bookmarkTitle: string | null;
  bookmarkUrl: string | null;
  /** Default number of replays per segment when a segment doesn't override it. */
  defaultMaxReplays: number;
  /** Default silent gap between reps (ms) when a segment doesn't override it. */
  defaultGapMs: number;
  /** The practice segments; null if none defined yet. */
  segments: ShadowingSegment[] | null;
  /** Timestamped notes taken during practice; null if none. */
  entries: ListeningEntry[] | null;
  /** Borrowed bookmark terms tagging this session; null if none. */
  terms: SentenceTermRef[] | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload for creating a shadowing session. Only `title` + `language` are required. */
export interface CreateShadowingSessionInput {
  title: string;
  language: string;
  videoUrl?: string | null;
  bookmarkId?: string | null;
  bookmarkTitle?: string | null;
  bookmarkUrl?: string | null;
  /** Defaults to 3 server-side when omitted. */
  defaultMaxReplays?: number;
  /** Defaults to 0 server-side when omitted. */
  defaultGapMs?: number;
  segments?: ShadowingSegment[] | null;
  entries?: ListeningEntry[] | null;
  terms?: SentenceTermRef[] | null;
}

/** Payload for partially updating a shadowing session. */
export type UpdateShadowingSessionInput = Partial<CreateShadowingSessionInput>;

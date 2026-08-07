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
import type { BookmarkRef, SessionXp, SessionXpInput } from "./session.js";

import { z } from "zod";

import { intAtLeast, isoDateString, nonNegativeInt, objectJsonSchema } from "./json-schema.js";
import { listeningEntrySchema } from "./listening-session.js";
import { bookmarkRefWriteFields, learningAreaField } from "./session.js";
import { termsListSchema } from "./terms.js";

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
export interface ShadowingSession extends SessionXp, BookmarkRef {
  id: string;
  /** ISO date (YYYY-MM-DD) the session happened, for grouping activity by day. */
  date: string;
  title: string;
  videoUrl: string | null;
  language: string;
  /** Default number of replays per segment when a segment doesn't override it. */
  defaultMaxReplays: number;
  /** Default silent gap between reps (ms) when a segment doesn't override it. */
  defaultGapMs: number;
  /** True when the session has an uploaded audio file (served at `/api/shadowing-sessions/:id/audio`). */
  hasAudio: boolean;
  /** Total segment loops (playback passes) completed across all practice runs (XP: 0.25 each). */
  completedLoops: number;
  /** The practice segments; null if none defined yet. */
  segments: ShadowingSegment[] | null;
  /** Timestamped notes taken during practice; null if none. */
  entries: ListeningEntry[] | null;
  /** Borrowed bookmark terms tagging this session; null if none. */
  terms: SentenceTermRef[] | null;
  /** The shadowing list whose sentences serve as this session's practice script; null for ad-hoc sessions. */
  shadowingListId: string | null;
  createdAt: string;
  updatedAt: string;
}

const segmentSchema = z.object({
  id: z.string(),
  label: z.string().nullable().optional(),
  startMs: z.number().min(0),
  endMs: z.number().min(0),
  maxReplays: intAtLeast(1).nullable().optional(),
  gapMs: nonNegativeInt().nullable().optional(),
});

/** Payload for creating a shadowing session. `title`, `language`, and `date` are required. */
export const createShadowingSessionSchema = z.object({
  title: z.string().min(1),
  language: z.string().min(1),
  /** ISO date (YYYY-MM-DD) the session happened. */
  date: isoDateString(),
  videoUrl: z.string().nullable().optional(),
  ...bookmarkRefWriteFields,
  /** Defaults to 3 server-side when omitted. */
  defaultMaxReplays: intAtLeast(1).optional(),
  /** Defaults to 0 server-side when omitted. */
  completedLoops: nonNegativeInt().optional(),
  /** Defaults to 0 server-side when omitted. */
  defaultGapMs: nonNegativeInt().optional(),
  segments: z.array(segmentSchema).nullable().optional(),
  entries: z.array(listeningEntrySchema).nullable().optional(),
  terms: termsListSchema.optional(),
  learningArea: learningAreaField(),
  countsTowardXp: z.boolean().optional(),
  /** Links the session to a shadowing list to practise from; null/omitted for ad-hoc sessions. */
  shadowingListId: z.guid().nullable().optional(),
});

/** JSON Schema (draft-07) for the create payload, used verbatim as the route body. */
export const createShadowingSessionJsonSchema = objectJsonSchema(createShadowingSessionSchema);

/**
 * Payload for creating a shadowing session.
 *
 * `segments` is overridden rather than inferred: the route requires only `id`, `startMs` and
 * `endMs`, while {@link ShadowingSegment} declares `label`/`maxReplays`/`gapMs` present-but-nullable.
 * See {@link bookmarkRefWriteFields} on the bookmark `Omit`.
 */
export type CreateShadowingSessionInput
  = Omit<
    z.infer<typeof createShadowingSessionSchema>,
    keyof BookmarkRef | keyof SessionXpInput | "segments"
  > & Partial<BookmarkRef> & SessionXpInput & {
    segments?: ShadowingSegment[] | null;
  };

/** Payload for partially updating a shadowing session. */
export type UpdateShadowingSessionInput = Partial<CreateShadowingSessionInput>;

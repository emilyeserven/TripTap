/**
 * Shared vocabulary for the study-session entities (drill, listening, shadowing, reading, theory,
 * lessons, dialogues).
 *
 * Every session type is a dated record with a small type-specific payload, but the metadata around
 * that payload accreted unevenly: the bookmark reference is repeated on four tables, and the two
 * fields that decide *how a session counts* — which learning area it feeds and whether it counts at
 * all — existed on three entities between them. The types here are the shared half, so a capability
 * added to one session type is available to all of them.
 */

import type { BookmarkSectionRef } from "./index.js";
import type { LearningArea } from "./question-sheet.js";

/**
 * A session's link back to the external bookmark it was based on, denormalized at selection time so
 * display never needs a live bookmarks call. Repeated verbatim on drill, listening, shadowing and
 * reading sessions and on dialogues (and, pluralized, on question sheets).
 */
export interface BookmarkRef {
  /** The bookmark's id in the external bookmarks app. */
  bookmarkId: string | null;
  /** The bookmark's title captured at selection time. */
  bookmarkTitle: string | null;
  /** The bookmark's URL captured at selection time. */
  bookmarkUrl: string | null;
  /** The specific section of the bookmark this session focuses on; null when none. */
  section: BookmarkSectionRef | null;
}

/**
 * How a session contributes to XP.
 *
 * `learningArea` lets the learner retarget a session — a listening session spent on grammar drills
 * should feed Grammar, not Listening. Null means "use the feature's default area", which is what
 * every session did unconditionally before this existed.
 *
 * `countsTowardXp` marks sourced-not-produced work. The rationale was written for dialogues ("a
 * dialogue copied out of a textbook is sourced, not produced, so it shouldn't count") and applies
 * to every session type just as well.
 */
export interface SessionXp {
  /** Learner-chosen area this session's XP feeds; null falls back to the feature's default. */
  learningArea: LearningArea | null;
  /** When false, the session earns no XP. */
  countsTowardXp: boolean;
}

/** The create/update half of {@link SessionXp} — both optional, defaulted server-side. */
export interface SessionXpInput {
  learningArea?: LearningArea | null;
  countsTowardXp?: boolean;
}

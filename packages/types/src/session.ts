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

import { z } from "zod";

import { fieldJsonSchema } from "./json-schema.js";
import { LEARNING_AREAS } from "./question-sheet.js";

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

/**
 * One stored bookmark-section reference, as a route body accepts it.
 *
 * Six route files each carried a verbatim copy of this shape — the same duplication Phase 1a
 * removed for term refs, still sitting in the session routes. Declared once here so a change lands
 * in one place.
 *
 * Deliberately narrower than {@link BookmarkSectionRef}: that type also carries `name`, `parentId`
 * and `completed`, which are populated only on live tag-match results and are not part of what a
 * client stores. The routes have always stripped them (`additionalProperties: false`), so this
 * mirrors the *validator*, not the type — widening it to the full type would start accepting fields
 * the API currently drops.
 */
export const bookmarkSectionRefWriteSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(["name", "url", "page", "timestamp"]),
  startValue: z.string().nullable().optional(),
  endValue: z.string().nullable().optional(),
}).nullable();

/** JSON Schema (draft-07) for a stored section reference — the routes' `section` field. */
export const bookmarkSectionRefJsonSchema = fieldJsonSchema(bookmarkSectionRefWriteSchema);

/**
 * The four bookmark columns of {@link BookmarkRef}, as route-body fields to spread into a session's
 * Zod schema. Spread rather than `.extend()`ed so each session keeps the field order its
 * hand-written body had — the four sit in the middle of some bodies and at the end of others.
 *
 * The matching input type is `Omit<z.infer<typeof schema>, keyof BookmarkRef> & Partial<BookmarkRef>`:
 * the *validator* stores the narrow section shape (see {@link bookmarkSectionRefWriteSchema}), but
 * the *type* has to keep accepting a full {@link BookmarkSectionRef}, since that is what a live
 * tag-match hands the client to submit.
 */
export const bookmarkRefWriteFields = {
  bookmarkId: z.string().nullable().optional(),
  bookmarkTitle: z.string().nullable().optional(),
  bookmarkUrl: z.string().nullable().optional(),
  section: bookmarkSectionRefWriteSchema.optional(),
};

/**
 * A session's learner-chosen learning area, as a route body accepts it — the same nullable
 * {@link LEARNING_AREAS} enum restated on every session route.
 */
export function learningAreaField() {
  return z.enum(LEARNING_AREAS).nullable().optional();
}

/**
 * Shared "Drill Buddy" domain types.
 *
 * A drill session is a mistake-logging journal: the learner drills elsewhere (with a tutor, on
 * renshuu, in a textbook) and records here each thing they got wrong, optionally the correct answer,
 * and a reflection on *why*. Each mistake is tagged with reusable, user-defined reasons organized as
 * Category → Subcategory → Reason (the {@link DrillReasonCategory} taxonomy), so mistakes can be
 * aggregated into statistics over time. Consumed by both the Fastify API and the React client.
 */

/* ── Reason taxonomy ──────────────────────────────────────────────────────────────────────────── */

/** One user-defined reason (the leaf of the taxonomy), e.g. "Wrong tense". */
export interface DrillReason {
  /** Client-generated id (via `newId()`), stable so statistics can reference it. */
  id: string;
  name: string;
}

/** A subcategory grouping reasons within a {@link DrillReasonCategory}, e.g. "Verb conjugation". */
export interface DrillSubcategory {
  /** Client-generated id (via `newId()`). */
  id: string;
  name: string;
  reasons: DrillReason[];
}

/** A top-level mistake-reason category, e.g. "Grammar". One DB row; subcategories are nested jsonb. */
export interface DrillReasonCategory {
  id: string;
  name: string;
  subcategories: DrillSubcategory[] | null;
  /** Reasons attached directly to the category, with no subcategory. */
  reasons: DrillReason[] | null;
  /** ISO-8601 timestamp of when the category was added. */
  createdAt: string;
  /** ISO-8601 timestamp of the last update. */
  updatedAt: string;
}

/** Payload for creating a reason category. Only `name` is required. */
export interface CreateDrillReasonCategoryInput {
  name: string;
  subcategories?: DrillSubcategory[] | null;
  reasons?: DrillReason[] | null;
}

/** Payload for partially updating a reason category. */
export type UpdateDrillReasonCategoryInput = Partial<CreateDrillReasonCategoryInput>;

/* ── Drill sessions ───────────────────────────────────────────────────────────────────────────── */

/**
 * A reference from a mistake into the reason taxonomy. `categoryId` is always present; `subcategoryId`
 * and `reasonId` are optional so a mistake can be classified at any depth. Resolved against the live
 * taxonomy at display/stats time; ids that no longer resolve are shown as "(deleted reason)".
 */
export interface DrillMistakeReasonRef {
  categoryId: string;
  subcategoryId?: string | null;
  reasonId?: string | null;
}

/** One thing the learner got wrong during a drill session. */
export interface DrillMistake {
  /** Client-generated id (via `newId()`). */
  id: string;
  /** The question or prompt that was asked. */
  question?: string | null;
  /** What they got wrong — the answer they gave. Kept only when non-empty. */
  prompt: string;
  /** The correct answer, when known. */
  correctAnswer?: string | null;
  /** Free-text reflection on *why* it was missed (lazy? tense/conjugation? …). */
  reflection?: string | null;
  /** Reasons this mistake is tagged with; see {@link DrillMistakeReasonRef}. */
  reasons: DrillMistakeReasonRef[];
}

/** A logged drill session: a date, optional title/notes, and the list of mistakes made. */
export interface DrillSession {
  id: string;
  /** ISO date (YYYY-MM-DD) the drilling happened. */
  date: string;
  title: string | null;
  notes: string | null;
  mistakes: DrillMistake[] | null;
  /** ISO-8601 timestamp of when the session was added. */
  createdAt: string;
  /** ISO-8601 timestamp of the last update. */
  updatedAt: string;
}

/** Payload for creating a drill session. Only `date` is required. */
export interface CreateDrillSessionInput {
  date: string;
  title?: string | null;
  notes?: string | null;
  mistakes?: DrillMistake[] | null;
}

/** Payload for partially updating a drill session. */
export type UpdateDrillSessionInput = Partial<CreateDrillSessionInput>;

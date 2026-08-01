/**
 * Shared "Start Something" domain types: the local resource favorites and the daily lineup.
 *
 * The lineup is the day's locked-in practice sequence — an ordered snapshot of Start Something
 * suggestions with done-checkoffs, plus the day's exclusions ("won't be home → no Book resources").
 * It is a today-only document stored as one JSON settings value (`start.lineup`); the client treats a
 * blob whose `date` isn't today as empty. Favorites (`start.favoriteResourceIds`) are TripTap-local —
 * the external bookmarks host's own Favorite flag is read-only to us. Consumed by both the Fastify
 * API and the React client.
 */

import type { BookmarkSectionRef } from "./index.js";
import type { LearningArea } from "./question-sheet.js";

/** The activity kinds a day's lineup can exclude (mapped to session routes client-side). */
export const LINEUP_SESSION_TYPES = [
  "reading",
  "listening",
  "shadowing",
  "writing",
  "drills",
  "practice",
] as const;

/** One excludable activity kind from {@link LINEUP_SESSION_TYPES}. */
export type LineupSessionType = (typeof LINEUP_SESSION_TYPES)[number];

/**
 * The kinds of Start Something suggestion (shared so lineup snapshots can't drift). `"custom"` is only
 * ever a lineup item — a learner-authored entry, never produced by the ranker.
 */
export type StartSuggestionKind = "due-sheet" | "area" | "starred-grammar" | "goal" | "custom";

/** Which item properties are excluded from suggestions/lineup-building for the day. */
export interface LineupExclusions {
  /** Upstream media-type names to avoid (e.g. "Book" when away from home). */
  mediaTypes: string[];
  sessionTypes: LineupSessionType[];
  learningAreas: LearningArea[];
  /** Lowest complexity level to allow (inclusive); null/absent means no lower bound. */
  complexityMin?: number | null;
  /** Highest complexity level to allow (inclusive); null/absent means no upper bound. */
  complexityMax?: number | null;
}

/** One locked-in lineup entry: a snapshot of the suggestion it was built from, plus done state. */
export interface LineupItem {
  id: string;
  kind: StartSuggestionKind;
  area: LearningArea | null;
  title: string;
  description: string | null;
  /** Router link target (with optional params/search), snapshotted from the suggestion. */
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
  /** The bookmark resource this item was built from, so it can be retargeted (rename/swap section). */
  resourceId?: string;
  /** The specific section of that resource, when the item is a section pick (absent for whole-resource). */
  sectionId?: string;
  done: boolean;
}

/** The day's lineup. `date` is the client-local YYYY-MM-DD it was built for. */
export interface DailyLineup {
  date: string;
  items: LineupItem[];
  exclusions: LineupExclusions;
}

/**
 * A lineup item set aside for a future day — either explicitly deferred, or an uncompleted item
 * harvested when its day rolled over. Lives in its own durable store (unlike the today-only lineup
 * blob, which is wiped each day), and surfaces as an add-candidate once `deferredTo` reaches today.
 */
export interface DeferredLineupItem extends LineupItem {
  /** Client-local YYYY-MM-DD this item becomes available to add again. */
  deferredTo: string;
}

/**
 * A recurring daily task: a resource the learner wants to work on every day. Its action is derived
 * live from the resource — the next uncompleted section (a Reading session) when it has sections, a
 * new Drill session when it's Drills-tagged and section-less, else a whole-resource Reading session.
 * A durable definition (unlike the today-only lineup); completion is tracked per day in
 * {@link DailyTaskDone}.
 */
export interface DailyTask {
  /** Stable id minted on create (`task-<uuid>`). */
  id: string;
  /** The bookmark resource this task points at. */
  resourceId: string;
  /** Snapshot of the resource title, for display while the live resource list loads. */
  resourceTitle: string;
  /** Optional override label; when null the card derives one from the resource / next section. */
  label: string | null;
  /** Optional learning area, used for the badge and to hint the reading/drill target. */
  area: LearningArea | null;
}

/**
 * What a {@link ScheduledTask} opens. Either a bookmark resource (optionally a specific section) or an
 * existing answer sheet (optionally focused on one "part" — a top-level question of its question sheet).
 */
export type ScheduledTaskTarget
  = | {
    kind: "resource";
    resourceId: string;
    /** Snapshot of the resource title, for display. */
    resourceTitle: string;
    /** The specific section to open, or null for the whole resource. */
    section: BookmarkSectionRef | null;
  }
  | {
    kind: "answer-sheet";
    answerSheetId: string;
    /** Snapshot of the answer sheet's title (or its question sheet's), for display. */
    title: string | null;
    /** A top-level question id to focus ("Part 1"), or null for the whole sheet. */
    partId: string | null;
  };

/**
 * A one-off task scheduled for a specific day (e.g. "tomorrow"): open a resource+section or an answer
 * sheet. Unlike {@link DailyTask} (recurring, resource-only), a scheduled task carries its own `date`
 * and `done` flag, and is cleared from the list once done + past. A durable definition stored in the
 * Start settings blob.
 */
export interface ScheduledTask {
  /** Stable id minted on create (`sched-<uuid>`). */
  id: string;
  /** Client-local YYYY-MM-DD the task is scheduled for. */
  date: string;
  /** Optional label; when null the row derives one from the target. */
  label: string | null;
  target: ScheduledTaskTarget;
  done: boolean;
}

/** Which daily tasks were checked off on a given day. Reset by the client when `date` isn't today. */
export interface DailyTaskDone {
  /** Client-local YYYY-MM-DD these check-offs belong to. */
  date: string;
  /** Ids of {@link DailyTask}s completed on `date`. */
  doneIds: string[];
}

/** The response of `GET /api/settings/start`. */
export interface StartSettings {
  /** Bookmark ids of locally-favorited resources, prioritized in Start Something suggestions. */
  favoriteResourceIds: string[];
  /** The stored lineup; null when none has been built. May be stale — the client date-checks it. */
  lineup: DailyLineup | null;
  /** Items deferred to a future day / carried over from an earlier one, awaiting re-add. */
  deferred: DeferredLineupItem[];
  /** The learner's recurring daily tasks (durable definitions). */
  dailyTasks: DailyTask[];
  /** Which daily tasks are checked off today; null when none/stale. The client date-checks it. */
  dailyTaskDone: DailyTaskDone | null;
  /** One-off tasks scheduled for a specific day (e.g. tomorrow). */
  scheduledTasks: ScheduledTask[];
}

/** Payload for updating the Start settings. Tri-state per field: omit = leave, null/[] = clear. */
export interface UpdateStartSettingsInput {
  favoriteResourceIds?: string[] | null;
  lineup?: DailyLineup | null;
  deferred?: DeferredLineupItem[] | null;
  dailyTasks?: DailyTask[] | null;
  dailyTaskDone?: DailyTaskDone | null;
  scheduledTasks?: ScheduledTask[] | null;
}

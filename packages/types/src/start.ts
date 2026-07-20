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

/** The kinds of Start Something suggestion (shared so lineup snapshots can't drift). */
export type StartSuggestionKind = "due-sheet" | "area" | "starred-grammar" | "goal";

/** Which item properties are excluded from suggestions/lineup-building for the day. */
export interface LineupExclusions {
  /** Upstream media-type names to avoid (e.g. "Book" when away from home). */
  mediaTypes: string[];
  sessionTypes: LineupSessionType[];
  learningAreas: LearningArea[];
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
  done: boolean;
}

/** The day's lineup. `date` is the client-local YYYY-MM-DD it was built for. */
export interface DailyLineup {
  date: string;
  items: LineupItem[];
  exclusions: LineupExclusions;
}

/** The response of `GET /api/settings/start`. */
export interface StartSettings {
  /** Bookmark ids of locally-favorited resources, prioritized in Start Something suggestions. */
  favoriteResourceIds: string[];
  /** The stored lineup; null when none has been built. May be stale — the client date-checks it. */
  lineup: DailyLineup | null;
}

/** Payload for updating the Start settings. Tri-state per field: omit = leave, null/[] = clear. */
export interface UpdateStartSettingsInput {
  favoriteResourceIds?: string[] | null;
  lineup?: DailyLineup | null;
}

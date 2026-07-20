/**
 * Shared XP (experience points) domain types.
 *
 * XP is *derived* server-side from the learner's persisted content — nothing is written when XP is
 * "earned". Every grant is attributed to one {@link LearningArea} so the learner can see which skills
 * they work on most (the spider graph on the Start Something page) and which are neglected (the
 * lowest-XP area drives the quick-task recommendation). Consumed by both the Fastify API and the
 * React client.
 */

import type { LearningArea } from "./question-sheet.js";

/** The feature buckets XP can come from, for per-area breakdowns. */
export const XP_FEATURES = [
  "reading",
  "writing",
  "bookExercises",
  "listening",
  "shadowing",
  "drills",
  "lessons",
] as const;

/** One feature bucket from {@link XP_FEATURES}. */
export type XpFeature = (typeof XP_FEATURES)[number];

/** All-time XP for one learning area, with a per-feature breakdown. */
export interface XpAreaSummary {
  area: LearningArea;
  /** Total XP earned in this area, all time. */
  xp: number;
  /** XP per contributing feature; features with no XP are omitted. */
  byFeature: Partial<Record<XpFeature, number>>;
}

/** XP earned within the recent window, per area. */
export interface XpRecentSummary {
  /** Window size in days (query param `days`, default 7). */
  days: number;
  totalXp: number;
  areas: { area: LearningArea;
    xp: number; }[];
}

/** The response of `GET /api/xp/summary`. `areas` always holds all six areas, zero-filled. */
export interface XpSummary {
  totalXp: number;
  areas: XpAreaSummary[];
  recent: XpRecentSummary;
}

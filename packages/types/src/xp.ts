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

/**
 * Default XP per counted item. The learner can override any rate on the Settings page (stored under
 * the `xp.rates` settings key); because XP is derived, a changed rate retroactively re-scores all
 * existing content on the next summary fetch.
 */
export const DEFAULT_XP_RATES = {
  readingTranslatedSentence: 2,
  readingWordNote: 1,
  writingSentence: 1,
  writingCorrection: 1,
  questionSheetAuthored: 5,
  answerEntryList: 2,
  answerEntryGrid: 0.25,
  listeningEntry: 1,
  shadowingLoop: 0.25,
  drillRound: 0.25,
  lessonLine: 1,
  lessonWordNote: 0.5,
} as const;

/** One adjustable rate from {@link DEFAULT_XP_RATES}. */
export type XpRateKey = keyof typeof DEFAULT_XP_RATES;

/** The stable key list, for iterating rates in UI/validation. */
export const XP_RATE_KEYS = Object.keys(DEFAULT_XP_RATES) as XpRateKey[];

/** A full set of effective rates (defaults merged with any stored overrides). */
export type XpRates = Record<XpRateKey, number>;

/** The response of `GET /api/settings/xp`: the effective rates. */
export interface XpSettings {
  rates: XpRates;
}

/**
 * Payload for updating the rates. Tri-state per key: omit = leave, `null` = reset to default, a
 * number = override. `rates: null` resets everything.
 */
export interface UpdateXpSettingsInput {
  rates?: Partial<Record<XpRateKey, number | null>> | null;
}

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

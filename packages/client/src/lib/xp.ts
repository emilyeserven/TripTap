import type { XpDayAreas, XpFeature } from "@sentence-bank/types";

/** Format XP without float noise: quarter-point values keep their decimals, whole values drop them. */
export function formatXp(xp: number): string {
  return Number.isInteger(xp) ? String(xp) : xp.toFixed(2).replace(/\.?0+$/, "");
}

/** Reader-facing names for the XP feature buckets (mirrors XpBreakdown's labels). */
export const XP_FEATURE_LABELS: Record<XpFeature, string> = {
  reading: "Reading",
  writing: "Writing",
  bookExercises: "Book exercise",
  listening: "Listening",
  shadowing: "Shadowing",
  drills: "Drills",
  lessons: "Lesson",
  theoryStudy: "Theory study",
};

/**
 * The outer-ring value for the radar's daily scale: the highest single-area XP across the given days,
 * rounded up to the nearest 10 (min 10). Keeping it fixed across the whole window means each day's
 * polygon is drawn on the same scale, so days are directly comparable as you click through them.
 */
export function radarScaleMax(days: XpDayAreas[]): number {
  const peak = Math.max(0, ...days.flatMap(day => day.areas.map(area => area.xp)));
  return Math.max(10, Math.ceil(peak / 10) * 10);
}

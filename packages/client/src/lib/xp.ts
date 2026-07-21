/** Format XP without float noise: quarter-point values keep their decimals, whole values drop them. */
export function formatXp(xp: number): string {
  return Number.isInteger(xp) ? String(xp) : xp.toFixed(2).replace(/\.?0+$/, "");
}

/**
 * The outer-ring value for the radar's daily (today/yesterday) scale. Starts at the learner's daily XP
 * goal — a positive number, else a sensible default of 5 — and grows in +5 steps until it covers the
 * largest single-area day total, so a day that blows past the goal still fits inside the chart.
 */
export function dailyRadarMax(dailyXpGoal: number | null, peak: number): number {
  let max = dailyXpGoal && dailyXpGoal > 0 ? dailyXpGoal : 5;
  while (peak > max) max += 5;
  return Math.max(1, max);
}

/**
 * Goal-met streak counting over per-learning-day XP totals.
 *
 * Like everything XP, streaks are derived on read: the caller folds the full grant history into
 * per-day totals (`dayXpTotals` in `services/xp.ts`, sharing `summarizeGrants`'s day-key rules so
 * the streak can never disagree with the goal-achievement strip) and this module walks the met-day
 * set. Changing the daily goal or the XP rates therefore rewrites streak history retroactively —
 * accepted, documented on the wire type.
 */

import type { XpStreak } from "@sentence-bank/types";

const DAY_MS = 86_400_000;

/** The learning-day key immediately before `key` (keys are YYYY-MM-DD, compared as UTC dates). */
function previousDayKey(key: string): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
}

/** The whole-day gap between two YYYY-MM-DD keys (`b` later than `a` → positive). */
function dayGap(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

/**
 * Count the goal-met streak: only days whose total reaches `dailyXpGoal` extend it (a partial day
 * breaks it — otherwise the goal would be decorative). `todayKey` is special: while in progress it
 * never breaks the streak, so an unmet today leaves `current` counting back from yesterday; the
 * break only lands at rollover.
 */
export function computeStreak(
  totals: Map<string, number>,
  dailyXpGoal: number,
  todayKey: string,
): XpStreak {
  const met = new Set<string>();
  for (const [key, total] of totals) {
    if (total >= dailyXpGoal) met.add(key);
  }
  const todayMet = met.has(todayKey);

  let current = 0;
  let cursor = todayMet ? todayKey : previousDayKey(todayKey);
  while (met.has(cursor)) {
    current += 1;
    cursor = previousDayKey(cursor);
  }

  // Longest consecutive-day run over the sorted met keys.
  let best = current;
  let run = 0;
  let prev: string | null = null;
  for (const key of [...met].sort()) {
    run = prev !== null && dayGap(prev, key) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = key;
  }

  return {
    current,
    best,
    todayMet,
  };
}

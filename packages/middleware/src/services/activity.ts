import type { ActivityDay, ActivityItem } from "@sentence-bank/types";
import { loadXpGrants, localDateString, type XpGrant } from "@/services/xp";

/** Round away float noise from fractional rates without hiding quarter points (mirrors xp.ts). */
function roundXp(xp: number): number {
  return Math.round(xp * 100) / 100;
}

/**
 * Fold a flat grant list into a per-day activity feed, newest day first. A grant's day is its
 * learner-entered `dateOnly` when present, else its `at` in the caller's local calendar
 * (`tzOffsetMinutes`, as reported by the browser's `getTimezoneOffset()`). Grants that share a
 * `sourceId` within a day are merged into one item with their XP summed — so a lesson's listening +
 * vocab grants, or a sheet's per-area splits, read as a single entry. Grants without a `sourceId`
 * each stand alone. Items are sorted highest-XP first within each day.
 */
export function groupActivityByDay(grants: XpGrant[], tzOffsetMinutes = 0): ActivityDay[] {
  // day → (mergeKey → item). Grants without a sourceId get a unique key so they never merge.
  const byDay = new Map<string, Map<string, ActivityItem>>();
  let anon = 0;

  for (const grant of grants) {
    if (grant.xp <= 0) continue;
    const day = grant.dateOnly ?? localDateString(grant.at, tzOffsetMinutes);
    let items = byDay.get(day);
    if (!items) {
      items = new Map();
      byDay.set(day, items);
    }
    const key = grant.sourceId ?? `anon:${anon++}`;
    const bonus = grant.goalBonusXp ?? 0;
    const existing = items.get(key);
    if (existing) {
      existing.xp += grant.xp;
      if (bonus > 0) existing.goalBonusXp = (existing.goalBonusXp ?? 0) + bonus;
    }
    else {
      items.set(key, {
        type: grant.feature,
        id: grant.sourceId ?? null,
        title: grant.title ?? null,
        xp: grant.xp,
        to: grant.to,
        params: grant.params,
        ...(bonus > 0
          ? {
            goalBonusXp: bonus,
          }
          : {}),
      });
    }
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, items]) => {
      const list = [...items.values()]
        .map((item) => {
          const goalBonusXp = item.goalBonusXp ? roundXp(item.goalBonusXp) : undefined;
          return {
            ...item,
            xp: roundXp(item.xp),
            ...(goalBonusXp !== undefined
              ? {
                goalBonusXp,
              }
              : {}),
          };
        })
        .sort((a, b) => b.xp - a.xp);
      const dayBonus = roundXp(list.reduce((sum, item) => sum + (item.goalBonusXp ?? 0), 0));
      return {
        date,
        totalXp: roundXp(list.reduce((sum, item) => sum + item.xp, 0)),
        ...(dayBonus > 0
          ? {
            goalBonusXp: dayBonus,
          }
          : {}),
        items: list,
      };
    });
}

/**
 * The daily activity feed for the most recent `days` calendar days (in the caller's local calendar),
 * built from the same derived XP grants as the summary so the numbers always agree.
 */
export async function getActivity(days: number, tzOffsetMinutes = 0): Promise<ActivityDay[]> {
  const grants = await loadXpGrants();
  const all = groupActivityByDay(grants, tzOffsetMinutes);
  const cutoff = localDateString(
    new Date(Date.now() - days * 24 * 60 * 60 * 1000),
    tzOffsetMinutes,
  );
  return all.filter(day => day.date >= cutoff);
}

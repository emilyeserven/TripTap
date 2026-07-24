import type { ActivityDay } from "@sentence-bank/types";

import { todayDateString } from "@/lib/daily-lineup";

/** One day's achievement status against the daily XP goal. */
export type DayStatus = "met" | "partial" | "none" | "active";

export interface StripDay {
  dateKey: string;
  dow: string;
  status: DayStatus;
  isToday: boolean;
  totalXp: number;
}

/** The learning-day key (YYYY-MM-DD) for `at`, shifted back by `dayStartHour` so it matches the server's buckets. */
export function learningDayKey(at: Date, dayStartHour: number): string {
  return todayDateString(new Date(at.getTime() - dayStartHour * 3_600_000));
}

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Build the last `count` learning-days (oldest→newest), each tagged with whether the daily XP goal was
 * met. Days shift by `dayStartHour` to line up with the server's activity buckets; days with no logged
 * XP read as "none". With no goal set, a day with any XP reads as "active".
 */
export function buildStrip(
  activity: ActivityDay[],
  dailyXpGoal: number | null,
  dayStartHour: number,
  count: number,
  now: Date,
): StripDay[] {
  const totals = new Map(activity.map(d => [d.date, d.totalXp] as const));
  const todayKey = learningDayKey(now, dayStartHour);
  const days: StripDay[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const at = new Date(now.getTime() - dayStartHour * 3_600_000 - i * 86_400_000);
    const dateKey = todayDateString(at);
    const totalXp = totals.get(dateKey) ?? 0;
    const status: DayStatus = dailyXpGoal && dailyXpGoal > 0
      ? (totalXp >= dailyXpGoal ? "met" : totalXp > 0 ? "partial" : "none")
      : (totalXp > 0 ? "active" : "none");
    days.push({
      dateKey,
      dow: DOW[at.getDay()],
      status,
      isToday: dateKey === todayKey,
      totalXp,
    });
  }
  return days;
}

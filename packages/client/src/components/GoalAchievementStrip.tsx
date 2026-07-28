import type { DayStatus } from "@/lib/goal-achievement";
import type { ActivityDay } from "@sentence-bank/types";

import { Fragment, useMemo } from "react";

import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { buildStrip } from "@/lib/goal-achievement";
import { cn } from "@/lib/utils";

const CIRCLE_BY_STATUS: Record<DayStatus, string> = {
  met: "border-transparent bg-emerald-500 text-white dark:bg-emerald-600",
  partial: "border-amber-500/70 bg-amber-500/15 text-amber-600 dark:text-amber-400",
  active: "border-transparent bg-primary/70 text-primary-foreground",
  none: "border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground/50",
};

/** "7/28" from a YYYY-MM-DD key, without the leading zeros. */
function monthDay(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  return `${Number(month)}/${Number(day)}`;
}

/**
 * A horizontal strip of recent days under the XP chart showing which days the daily goal was hit
 * (filled check), partially worked (amber), or missed (dashed). Most recent day is on the **left**.
 * When `onSelectDay` is given each day becomes a button that drives the radar above; the chosen day
 * is ringed. Modeled on course-tracker's day tracking. `now` is injectable for tests.
 */
export function GoalAchievementStrip({
  activity,
  dailyXpGoal,
  dayStartHour = 0,
  count = 14,
  selectedDate = null,
  onSelectDay,
  now = new Date(),
}: {
  activity: ActivityDay[];
  dailyXpGoal: number | null;
  dayStartHour?: number;
  count?: number;
  /** The day currently plotted on the radar; ringed in the strip. */
  selectedDate?: string | null;
  /** When provided, each day is a button that selects it (drives the radar). */
  onSelectDay?: (dateKey: string) => void;
  now?: Date;
}) {
  // buildStrip returns oldest→newest; show most-recent on the left.
  const days = useMemo(
    () => buildStrip(activity, dailyXpGoal, dayStartHour, count, now).reverse(),
    [activity, dailyXpGoal, dayStartHour, count, now],
  );
  const metCount = days.filter(d => d.status === "met").length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {dailyXpGoal && dailyXpGoal > 0
            ? `Goal hit ${metCount} of the last ${count} days`
            : "Recent activity"}
        </p>
        {(!dailyXpGoal || dailyXpGoal <= 0) && (
          <Link
            to="/profile"
            search={{
              tab: "goals",
            }}
            className="
              text-xs text-muted-foreground
              hover:underline
            "
          >
            Set a daily goal
          </Link>
        )}
      </div>
      <div
        className="flex items-start overflow-x-auto pb-1 [scrollbar-width:thin]"
      >
        {days.map((day, i) => {
          const selected = selectedDate === day.dateKey;
          const dot = (
            <span
              className={cn(
                `
                  flex size-7 items-center justify-center rounded-full border
                  text-[0.6rem] tabular-nums
                `,
                CIRCLE_BY_STATUS[day.status],
                selected && `
                  ring-2 ring-primary ring-offset-1 ring-offset-background
                `,
                !selected && day.isToday && "ring-1 ring-primary/40",
              )}
            >
              {day.status === "met" ? <Check className="size-4" /> : null}
            </span>
          );
          return (
            <Fragment key={day.dateKey}>
              {i > 0 && (
                <span
                  className={cn(
                    "mt-[13px] h-0.5 w-3 shrink-0",
                    day.status === "met" && days[i - 1].status === "met"
                      ? "bg-emerald-500/60"
                      : "bg-border",
                  )}
                />
              )}
              <div className="flex shrink-0 flex-col items-center gap-1">
                {onSelectDay
                  ? (
                    <button
                      type="button"
                      onClick={() => onSelectDay(day.dateKey)}
                      aria-pressed={selected}
                      aria-label={`Show ${day.dateKey} on the chart — ${day.totalXp} XP`}
                      className="rounded-full"
                    >
                      {dot}
                    </button>
                  )
                  : dot}
                <span
                  className={cn(
                    "text-[0.6rem] leading-none",
                    day.isToday
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {day.dow}
                </span>
                <span
                  className="
                    text-[0.55rem] leading-none text-muted-foreground
                    tabular-nums
                  "
                >
                  {monthDay(day.dateKey)}
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

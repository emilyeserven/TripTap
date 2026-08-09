import type { XpStreak } from "@sentence-bank/types";

import { Flame } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The learner's goal-met streak, shown beside today's goal progress. Renders nothing without a
 * streak (no daily goal set — `DailyGoalProgress` already carries the set-a-goal nudge).
 */
export function StreakBadge({
  streak,
}: { streak: XpStreak | null }) {
  if (!streak) return null;
  return (
    <div className="flex items-center gap-1.5 text-sm whitespace-nowrap">
      <Flame
        className={cn(
          "size-4",
          streak.current > 0 ? "text-orange-500" : "text-muted-foreground/50",
        )}
        aria-hidden
      />
      <span className="font-medium tabular-nums">
        {streak.current}
        -day streak
      </span>
      <span className="text-muted-foreground tabular-nums">
        · best {streak.best}
      </span>
      {streak.current > 0 && !streak.todayMet && (
        <span className="text-xs text-muted-foreground">
          — meet today&apos;s goal to keep it
        </span>
      )}
    </div>
  );
}

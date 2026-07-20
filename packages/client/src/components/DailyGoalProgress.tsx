import { Link } from "@tanstack/react-router";

import { Progress } from "@/components/ui/progress";
import { formatXp } from "@/lib/xp";

/** Today's XP against the learner's daily goal; a nudge to set one when absent. */
export function DailyGoalProgress({
  todayXp,
  dailyXpGoal,
}: {
  todayXp: number;
  dailyXpGoal: number | null;
}) {
  if (dailyXpGoal === null) {
    return (
      <p className="text-sm text-muted-foreground">
        {formatXp(todayXp)}
        {" "}
        xp earned today.
        {" "}
        <Link
          to="/profile"
          className="
            text-primary
            hover:underline
          "
        >
          Set a daily goal
        </Link>
        {" "}
        to track it against a target.
      </p>
    );
  }

  const met = todayXp >= dailyXpGoal;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">
          {met ? "Daily goal met!" : "Today"}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {formatXp(todayXp)} / {formatXp(dailyXpGoal)} xp
        </span>
      </div>
      <Progress value={Math.min(100, (todayXp / dailyXpGoal) * 100)} />
    </div>
  );
}

import type { ActivityDay, ActivityItem, XpFeature } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivity } from "@/hooks/useActivity";
import { formatXp } from "@/lib/xp";

/** Reader-facing names for the XP feature buckets (mirrors XpBreakdown's labels). */
const TYPE_LABELS: Record<XpFeature, string> = {
  reading: "Reading",
  writing: "Writing",
  bookExercises: "Book exercise",
  listening: "Listening",
  shadowing: "Shadowing",
  drills: "Drills",
  lessons: "Lesson",
  theoryStudy: "Theory study",
};

/** The title cell for one activity item: a link when the source is addressable, else plain text. */
function ItemTitle({
  item,
}: {
  item: ActivityItem;
}) {
  const label = item.title || TYPE_LABELS[item.type];
  if (item.to) {
    return (
      <Link
        // The stored `to`/`params` come from the server's typed routes; the router types can't know that.
        to={item.to as never}
        params={item.params as never}
        className="
          text-primary
          hover:underline
        "
      >
        {label}
      </Link>
    );
  }
  return <span>{label}</span>;
}

/** One day's table: a row per XP-earning item, with a per-day total in the header. */
function ActivityDayTable({
  day,
}: {
  day: ActivityDay;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{day.date}</h3>
        <span
          className="
            flex items-center gap-2 text-sm text-muted-foreground tabular-nums
          "
        >
          {day.goalBonusXp
            ? (
              <Badge
                variant="secondary"
                className="gap-1 text-[10px] font-medium"
                title="Includes a goal-alignment bonus"
              >
                <Target className="size-3" />
                +
                {formatXp(day.goalBonusXp)}
                {" "}
                goal
              </Badge>
            )
            : null}
          {formatXp(day.totalXp)} xp
        </span>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <tbody>
            {day.items.map((item, i) => (
              <tr
                key={`${item.type}-${item.id ?? i}`}
                className="
                  border-b
                  last:border-b-0
                "
              >
                <td
                  className="
                    px-3 py-2 text-xs whitespace-nowrap text-muted-foreground
                  "
                >
                  {TYPE_LABELS[item.type]}
                </td>
                <td className="px-3 py-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <ItemTitle item={item} />
                    {item.goalBonusXp
                      ? (
                        <Badge
                          variant="secondary"
                          className="gap-1 text-[10px] font-medium"
                          title="Includes a goal-alignment bonus"
                        >
                          <Target className="size-3" />
                          +
                          {formatXp(item.goalBonusXp)}
                          {" "}
                          goal
                        </Badge>
                      )
                      : null}
                  </span>
                </td>
                <td
                  className="
                    px-3 py-2 text-right whitespace-nowrap tabular-nums
                  "
                >
                  {formatXp(item.xp)} xp
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * The daily activity log: a per-day table of the work that earned XP, each row linking back to its
 * source. Server-computed from the same derived XP as the summary, so the numbers always agree.
 */
export function ActivityLogCard() {
  const {
    data, isLoading, error,
  } = useActivity();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity log</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading activity…</p> : null}
        {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
        {data && data.length === 0
          ? (
            <p className="text-sm text-muted-foreground">
              No activity yet. Log some practice and it’ll show up here, grouped by day.
            </p>
          )
          : null}
        {data?.map(day => (
          <ActivityDayTable
            key={day.date}
            day={day}
          />
        ))}
      </CardContent>
    </Card>
  );
}

import type { XpAreaSummary, XpFeature, XpSummary } from "@sentence-bank/types";

import { Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatXp } from "@/lib/xp";

/** Which slice of the summary the breakdown shows. */
export type XpBreakdownView = "all-time" | "today" | "yesterday";

/** Reader-facing names for the XP feature buckets. */
const FEATURE_LABELS: Record<XpFeature, string> = {
  reading: "Reading sessions",
  writing: "Writing",
  bookExercises: "Book exercises",
  listening: "Listening",
  shadowing: "Shadowing",
  drills: "Drills",
  lessons: "Lessons",
  theoryStudy: "Theory study",
};

/** One learning area's bar with an indented, per-feature row breakdown beneath it. */
function AreaRow({
  area,
  max,
}: {
  area: XpAreaSummary;
  max: number;
}) {
  const features = (Object.entries(area.byFeature) as [XpFeature, number][])
    .sort(([, a], [, b]) => b - a);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5">
          {area.area}
          {area.goalBonusXp
            ? (
              <Badge
                variant="secondary"
                className="gap-1 text-[10px] font-medium"
                title="Includes a goal-alignment bonus"
              >
                <Target className="size-3" />
                +
                {formatXp(area.goalBonusXp)}
                {" "}
                goal
              </Badge>
            )
            : null}
        </span>
        <span className="shrink-0 text-muted-foreground tabular-nums">
          {formatXp(area.xp)} xp
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{
            width: `${(area.xp / max) * 100}%`,
          }}
        />
      </div>
      {features.length > 0 && (
        <ul className="space-y-0.5 pl-3 text-xs text-muted-foreground">
          {features.map(([feature, xp]) => (
            <li
              key={feature}
              className="flex items-center justify-between gap-2"
            >
              <span>{FEATURE_LABELS[feature]}</span>
              <span className="shrink-0 tabular-nums">{formatXp(xp)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The table view of the XP summary: one bar row per learning area (the `DrillStats` bar style) with a
 * per-feature row breakdown beneath, a Today ⇄ All-time toggle over the areas, plus the recent-window
 * rollup so "what have I done lately" is one glance. The toggle is controlled so the page can lift it.
 */
export function XpBreakdown({
  summary,
  view,
  onViewChange,
}: {
  summary: XpSummary;
  view: XpBreakdownView;
  onViewChange: (view: XpBreakdownView) => void;
}) {
  const areas = view === "today"
    ? summary.today.areas
    : view === "yesterday"
      ? summary.yesterday.areas
      : summary.areas;
  const max = Math.max(1, ...areas.map(a => a.xp));
  const emptyMessage = view === "today"
    ? "No XP yet today — log some practice and it’ll show up here."
    : view === "yesterday"
      ? "No XP recorded yesterday."
      : "No XP yet — log some practice and it’ll show up here.";
  return (
    <div className="space-y-4">
      <Tabs
        value={view}
        onValueChange={v => onViewChange(v as XpBreakdownView)}
      >
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
          <TabsTrigger value="all-time">All-time</TabsTrigger>
        </TabsList>
      </Tabs>

      {areas.length === 0
        ? (
          <p className="text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        )
        : (
          <div className="space-y-3">
            {areas.map(area => (
              <AreaRow
                key={area.area}
                area={area}
                max={max}
              />
            ))}
          </div>
        )}

      <p className="text-sm text-muted-foreground">
        Last
        {" "}
        {summary.recent.days}
        {" "}
        days:
        {" "}
        <span className="font-medium text-foreground tabular-nums">
          {formatXp(summary.recent.totalXp)} xp
        </span>
        {summary.recent.areas.length > 0 && (
          <>
            {" — "}
            {summary.recent.areas
              .map(area => `${area.area} ${formatXp(area.xp)}`)
              .join(", ")}
          </>
        )}
      </p>
    </div>
  );
}

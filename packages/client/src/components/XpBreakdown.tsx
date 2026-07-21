import type { XpFeature, XpSummary } from "@sentence-bank/types";

import { formatXp } from "@/lib/xp";

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

/**
 * The table view of the XP summary: one bar row per learning area (the `DrillStats` bar style) with
 * its per-feature makeup, plus the recent-window rollup so "what have I done lately" is one glance.
 */
export function XpBreakdown({
  summary,
}: {
  summary: XpSummary;
}) {
  const max = Math.max(1, ...summary.areas.map(a => a.xp));
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {summary.areas.map((area) => {
          const features = Object.entries(area.byFeature) as [XpFeature, number][];
          return (
            <div
              key={area.area}
              className="space-y-1"
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span>{area.area}</span>
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
                <p className="text-xs text-muted-foreground">
                  {features
                    .map(([feature, xp]) => `${FEATURE_LABELS[feature]} ${formatXp(xp)}`)
                    .join(" · ")}
                </p>
              )}
            </div>
          );
        })}
      </div>

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

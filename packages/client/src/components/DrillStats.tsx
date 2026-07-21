import { useMemo, useState } from "react";

import { DrillRecurringCallout } from "@/components/DrillRecurringCallout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDrillReasonCategories } from "@/hooks/useDrillReasonCategories";
import { useDrillSessions } from "@/hooks/useDrillSessions";
import { REASON_PATH_SEP, resolveReasonRef } from "@/lib/drill-reasons";
import { flaggedRecurringQuestions } from "@/lib/drill-recurring";

type Granularity = "category" | "subcategory" | "reason";

const GRANULARITIES: { key: Granularity;
  label: string; }[] = [
  {
    key: "category",
    label: "Category",
  },
  {
    key: "subcategory",
    label: "Subcategory",
  },
  {
    key: "reason",
    label: "Reason",
  },
];

const UNTAGGED = "(untagged)";

/**
 * Basic statistics over logged mistakes: counts grouped by the reason taxonomy at a selectable
 * granularity, drawn as plain bar-rows (no chart library). Untagged mistakes bucket under "(untagged)".
 */
export function DrillStats() {
  const sessionsQuery = useDrillSessions();
  const categoriesQuery = useDrillReasonCategories();
  const [granularity, setGranularity] = useState<Granularity>("category");

  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  const totalMistakes = useMemo(
    () => sessions.reduce((n, s) => n + (s.mistakes?.length ?? 0), 0),
    [sessions],
  );

  const recurring = useMemo(() => flaggedRecurringQuestions(sessions, new Date()), [sessions]);

  const rows = useMemo(() => {
    const counts = new Map<string, number>();
    const bump = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);

    for (const session of sessions) {
      for (const mistake of session.mistakes ?? []) {
        if (mistake.reasons.length === 0) {
          bump(UNTAGGED);
          continue;
        }
        for (const ref of mistake.reasons) {
          const resolved = resolveReasonRef(categories, ref);
          let key: string;
          if (granularity === "category") {
            key = resolved.categoryName ?? "(deleted reason)";
          }
          else if (granularity === "subcategory") {
            key = [resolved.categoryName, resolved.subcategoryName]
              .filter((p): p is string => p !== null)
              .join(REASON_PATH_SEP) || "(deleted reason)";
          }
          else {
            key = resolved.label;
          }
          bump(key);
        }
      }
    }

    return [...counts.entries()]
      .map(([label, count]) => ({
        label,
        count,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [sessions, categories, granularity]);

  const max = rows.length > 0 ? rows[0].count : 0;
  const loading = sessionsQuery.isLoading || categoriesQuery.isLoading;

  return (
    <section className="space-y-6">
      <DrillRecurringCallout items={recurring} />

      <div>
        <p className="text-sm text-muted-foreground">
          Where your mistakes cluster, across {sessions.length}{" "}
          {sessions.length === 1 ? "session" : "sessions"} and {totalMistakes}{" "}
          {totalMistakes === 1 ? "mistake" : "mistakes"}.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Group by</span>
        {GRANULARITIES.map(g => (
          <Button
            key={g.key}
            type="button"
            size="sm"
            variant={granularity === g.key ? "default" : "outline"}
            onClick={() => setGranularity(g.key)}
          >
            {g.label}
          </Button>
        ))}
      </div>

      {loading ? <p className="text-muted-foreground">Loading…</p> : null}
      {!loading && rows.length === 0
        ? <p className="text-muted-foreground">No mistakes logged yet.</p>
        : null}

      {rows.length > 0
        ? (
          <Card>
            <CardContent className="space-y-3 p-4">
              {rows.map(row => (
                <div
                  key={row.label}
                  className="space-y-1"
                >
                  <div
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">{row.label}</span>
                    <span
                      className="shrink-0 text-muted-foreground tabular-nums"
                    >{row.count}
                    </span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${max > 0 ? (row.count / max) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )
        : null}
    </section>
  );
}

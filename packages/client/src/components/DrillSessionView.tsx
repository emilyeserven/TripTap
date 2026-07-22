import type { DrillMistakeReasonRef, DrillSession } from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { ExternalLink } from "lucide-react";

import { DrillMistakeCard } from "@/components/DrillMistakeCard";
import { DrillQuestionsCounter } from "@/components/DrillQuestionsCounter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDrillReasonCategories } from "@/hooks/useDrillReasonCategories";
import { resolveReasonRef } from "@/lib/drill-reasons";

/** A stable key for one reason reference, at whatever depth it names. */
function reasonKey(ref: DrillMistakeReasonRef): string {
  return `${ref.categoryId}:${ref.subcategoryId ?? ""}:${ref.reasonId ?? ""}`;
}

/** Read-only view of a drill session: its date/title/notes and each logged mistake with its reasons. */
export function DrillSessionView({
  session,
}: {
  session: DrillSession;
}) {
  const categoriesQuery = useDrillReasonCategories();
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const mistakes = useMemo(() => session.mistakes ?? [], [session.mistakes]);
  const [selectedReasons, setSelectedReasons] = useState<Set<string>>(new Set());

  // The distinct reasons tagged across this session's mistakes, for the filter chips.
  const reasonOptions = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const m of mistakes) {
      for (const ref of m.reasons) {
        const key = reasonKey(ref);
        if (!byKey.has(key)) byKey.set(key, resolveReasonRef(categories, ref).label);
      }
    }
    return [...byKey.entries()].map(([key, label]) => ({
      key,
      label,
    }));
  }, [mistakes, categories]);

  const toggleReason = (key: string) => setSelectedReasons((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  // Filter to mistakes tagged with any selected reason — so the learner can zero in on, say, the
  // words they completely forgot. No selection shows everything.
  const visibleMistakes = selectedReasons.size === 0
    ? mistakes
    : mistakes.filter(m => m.reasons.some(ref => selectedReasons.has(reasonKey(ref))));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xl font-semibold">{session.title ?? session.date}</p>
        <div
          className="
            flex flex-wrap items-center gap-2 text-xs text-muted-foreground
          "
        >
          <span>{session.date}</span>
          <Badge variant="secondary">
            {mistakes.length} {mistakes.length === 1 ? "mistake" : "mistakes"}
          </Badge>
          {session.learningArea && <Badge variant="outline">{session.learningArea}</Badge>}
        </div>
        {session.bookmarkId && session.bookmarkTitle && (
          <p className="text-sm text-muted-foreground">
            From resource:
            {" "}
            <span className="font-medium text-foreground">{session.bookmarkTitle}</span>
            {session.section && (
              <span> · {session.section.label}</span>
            )}
            {session.bookmarkUrl && (
              <a
                href={session.bookmarkUrl}
                target="_blank"
                rel="noreferrer"
                className="
                  ml-2 inline-flex items-center gap-1 text-primary
                  hover:underline
                "
              >
                open
                <ExternalLink className="size-3" />
              </a>
            )}
          </p>
        )}
        {session.notes
          ? <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
          : null}
        <DrillQuestionsCounter session={session} />
      </div>

      {reasonOptions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Filter by reason</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {reasonOptions.map((option) => {
              const active = selectedReasons.has(option.key);
              return (
                <Button
                  key={option.key}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  aria-pressed={active}
                  onClick={() => toggleReason(option.key)}
                >
                  {option.label}
                </Button>
              );
            })}
            {selectedReasons.size > 0 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSelectedReasons(new Set())}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {mistakes.length === 0
        ? <p className="text-sm text-muted-foreground">No mistakes logged in this session.</p>
        : visibleMistakes.length === 0
          ? <p className="text-sm text-muted-foreground">No mistakes match the selected reasons.</p>
          : (
            <ul className="space-y-3">
              {visibleMistakes.map(m => (
                <li key={m.id}>
                  <DrillMistakeCard
                    mistake={m}
                    categories={categories}
                  />
                </li>
              ))}
            </ul>
          )}
    </div>
  );
}

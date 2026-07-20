import type { DrillSession } from "@sentence-bank/types";

import { DrillMistakeCard } from "@/components/DrillMistakeCard";
import { DrillRoundsCounter } from "@/components/DrillRoundsCounter";
import { Badge } from "@/components/ui/badge";
import { useDrillReasonCategories } from "@/hooks/useDrillReasonCategories";

/** Read-only view of a drill session: its date/title/notes and each logged mistake with its reasons. */
export function DrillSessionView({
  session,
}: {
  session: DrillSession;
}) {
  const categoriesQuery = useDrillReasonCategories();
  const categories = categoriesQuery.data ?? [];
  const mistakes = session.mistakes ?? [];

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
        {session.notes
          ? <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
          : null}
        <DrillRoundsCounter session={session} />
      </div>

      {mistakes.length === 0
        ? <p className="text-sm text-muted-foreground">No mistakes logged in this session.</p>
        : (
          <ul className="space-y-3">
            {mistakes.map(m => (
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

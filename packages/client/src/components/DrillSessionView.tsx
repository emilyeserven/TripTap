import type { DrillSession } from "@sentence-bank/types";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useDrillReasonCategories } from "@/hooks/useDrillReasonCategories";
import { resolveReasonRef } from "@/lib/drill-reasons";

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
      <Card>
        <CardContent className="space-y-2 p-4">
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
          </div>
          {session.notes
            ? <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
            : null}
        </CardContent>
      </Card>

      {mistakes.length === 0
        ? <p className="text-sm text-muted-foreground">No mistakes logged in this session.</p>
        : (
          <ul className="space-y-3">
            {mistakes.map(m => (
              <li key={m.id}>
                <Card>
                  <CardContent className="space-y-2 p-4">
                    {m.question
                      ? <p className="font-medium">{m.question}</p>
                      : null}
                    <p
                      className={m.question
                        ? "text-sm text-muted-foreground"
                        : "font-medium"}
                    >
                      {m.question ? "You put: " : null}
                      <span className={m.question ? "text-foreground" : undefined}>{m.prompt}</span>
                    </p>
                    {m.correctAnswer
                      ? (
                        <p className="text-sm text-muted-foreground">
                          Correct:
                          {" "}
                          <span className="text-foreground">{m.correctAnswer}</span>
                        </p>
                      )
                      : null}
                    {m.reasons.length > 0
                      ? (
                        <div className="flex flex-wrap gap-1.5">
                          {m.reasons.map((ref, i) => (
                            <Badge
                              key={ref.reasonId ?? `${ref.categoryId}-${i}`}
                              variant="outline"
                            >
                              {resolveReasonRef(categories, ref).label}
                            </Badge>
                          ))}
                        </div>
                      )
                      : null}
                    {m.reflection
                      ? <p className="text-sm whitespace-pre-wrap italic">{m.reflection}</p>
                      : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

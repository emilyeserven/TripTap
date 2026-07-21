import type { TheorySession } from "@sentence-bank/types";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Read-only view of a single theory session: its measure, notes count, and freeform notes. */
export function TheorySessionView({
  session,
}: {
  session: TheorySession;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{session.title ?? "Theory study"}</h1>
        <div
          className="
            flex flex-wrap items-center gap-2 text-sm text-muted-foreground
          "
        >
          <span>{session.date}</span>
          <Badge variant="outline">{session.learningArea ?? "Grammar"}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What you studied</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {session.entryMode === "pages"
            ? (
              <p>
                <span className="font-medium">{session.pages ?? 0}</span>
                {" "}
                {(session.pages ?? 0) === 1 ? "page" : "pages"}
                {" · "}
                <span className="capitalize">{session.density ?? "medium"}</span>
                {" density"}
              </p>
            )
            : (
              <p>
                <span className="font-medium">{session.wordCount ?? 0}</span>
                {" words"}
              </p>
            )}
          <p className="text-muted-foreground">
            {session.notesCount} {session.notesCount === 1 ? "note" : "notes"} taken
          </p>
        </CardContent>
      </Card>

      {session.notes
        ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
            </CardContent>
          </Card>
        )
        : null}
    </div>
  );
}

import type { TheorySession } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/** A short human summary of how a theory session is measured (pages + density, or a word count). */
function measureLabel(session: TheorySession): string {
  if (session.entryMode === "pages") {
    const pages = session.pages ?? 0;
    return `${pages} ${pages === 1 ? "page" : "pages"} (${session.density ?? "medium"})`;
  }
  const words = session.wordCount ?? 0;
  return `${words} ${words === 1 ? "word" : "words"}`;
}

/** Compact list-item for one theory session: title/date link and a measure + notes count. */
export function TheorySessionCard({
  session,
}: {
  session: TheorySession;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <Link
          to="/theory-sessions/$id"
          params={{
            id: session.id,
          }}
          className="
            text-lg font-semibold
            hover:underline
          "
        >
          {session.title ?? session.date}
        </Link>
        <div
          className="
            flex flex-wrap items-center gap-2 text-xs text-muted-foreground
          "
        >
          <span>{session.date}</span>
          <Badge variant="secondary">{measureLabel(session)}</Badge>
          {session.notesCount > 0
            ? (
              <Badge variant="secondary">
                {session.notesCount} {session.notesCount === 1 ? "note" : "notes"}
              </Badge>
            )
            : null}
          <Badge variant="outline">Grammar</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

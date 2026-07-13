import type { ReadingSession } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useSources } from "@/hooks/useSources";

/** Compact list-item for one reading session: title link, origin, mode, and word-note count. */
export function ReadingSessionCard({
  session,
  onDelete,
}: {
  session: ReadingSession;
  onDelete: (id: string) => void;
}) {
  const {
    data: sources,
  } = useSources();
  const sourceName = session.sourceId
    ? (sources ?? []).find(s => s.id === session.sourceId)?.name ?? null
    : null;
  const wordCount = session.wordNotes?.length ?? 0;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            to="/reading-sessions/$id"
            params={{
              id: session.id,
            }}
            className="
              text-lg font-semibold
              hover:underline
            "
          >
            {session.title}
          </Link>
          <button
            type="button"
            className="
              text-sm text-destructive
              hover:underline
            "
            onClick={() => onDelete(session.id)}
          >
            Delete
          </button>
        </div>
        <div
          className="
            flex flex-wrap items-center gap-2 text-xs text-muted-foreground
          "
        >
          <span>{session.language}</span>
          <Badge variant="secondary">
            {session.mode === "line-by-line" ? "Line by line" : "Freeform"}
          </Badge>
          {sourceName ? <span>From: {sourceName}</span> : null}
          {session.page ? <span>· {session.page}</span> : null}
          {wordCount > 0
            ? (
              <Badge variant="outline">
                {wordCount} {wordCount === 1 ? "word" : "words"}
              </Badge>
            )
            : null}
        </div>
      </CardContent>
    </Card>
  );
}

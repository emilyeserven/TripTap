import type { DrillSession } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/** Compact list-item for one drill session: title/date link and a mistake count. */
export function DrillSessionCard({
  session,
}: {
  session: DrillSession;
}) {
  const count = session.mistakes?.length ?? 0;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <Link
          to="/drill-sessions/$id"
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
          {count > 0
            ? (
              <Badge variant="secondary">
                {count} {count === 1 ? "mistake" : "mistakes"}
              </Badge>
            )
            : null}
        </div>
      </CardContent>
    </Card>
  );
}

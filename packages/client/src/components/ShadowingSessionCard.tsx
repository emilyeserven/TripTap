import type { ShadowingSession } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { Repeat2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** One shadowing session in the index list. Links to its read-only view page. */
export function ShadowingSessionCard({
  session,
}: {
  session: ShadowingSession;
}) {
  const segmentCount = session.segments?.length ?? 0;
  const noteCount = session.entries?.length ?? 0;
  return (
    <Link
      to="/shadowing/$id"
      params={{
        id: session.id,
      }}
      className="block"
    >
      <Card
        className="
          transition-colors
          hover:border-primary
        "
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat2 className="size-4 shrink-0 text-muted-foreground" />
            {session.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>{session.language}</p>
          {session.bookmarkTitle && <p>Bookmark: {session.bookmarkTitle}</p>}
          <p>
            {segmentCount} {segmentCount === 1 ? "segment" : "segments"} · {noteCount}{" "}
            {noteCount === 1 ? "note" : "notes"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

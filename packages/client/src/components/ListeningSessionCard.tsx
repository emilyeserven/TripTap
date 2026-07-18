import type { ListeningSession } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { Headphones } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** One listen-and-shadow session in the index list. Links to its read-only view page. */
export function ListeningSessionCard({
  session,
}: {
  session: ListeningSession;
}) {
  const noteCount = session.entries?.length ?? 0;
  return (
    <Link
      to="/listening-sessions/$id"
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
            <Headphones className="size-4 shrink-0 text-muted-foreground" />
            {session.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>{session.language}</p>
          {session.bookmarkTitle && <p>Bookmark: {session.bookmarkTitle}</p>}
          {session.section && <p>Section: {session.section.label}</p>}
          <p>{noteCount} {noteCount === 1 ? "note" : "notes"}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

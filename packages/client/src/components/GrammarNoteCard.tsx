import type { GrammarNote } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";

import { Card, CardContent } from "@/components/ui/card";

/** Compact list-item for one grammar note: title + nuance, counts, and a snippet of the summary. */
export function GrammarNoteCard({
  note,
}: {
  note: GrammarNote;
}) {
  const counts = [
    note.constructions.length
      ? `${note.constructions.length} construction${note.constructions.length === 1 ? "" : "s"}`
      : null,
    note.relations.length
      ? `${note.relations.length} relation${note.relations.length === 1 ? "" : "s"}`
      : null,
    note.resources.length
      ? `${note.resources.length} resource${note.resources.length === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);

  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <Link
            to="/grammar-notes/$id"
            params={{
              id: note.id,
            }}
            className="
              text-lg font-semibold
              hover:underline
            "
          >
            {note.title}
          </Link>
          {note.nuance
            ? <span className="text-sm text-muted-foreground">{note.nuance}</span>
            : null}
        </div>
        {counts.length > 0
          ? <p className="text-xs text-muted-foreground">{counts.join(" · ")}</p>
          : null}
        {note.summary
          ? <p className="line-clamp-2 text-sm text-muted-foreground">{note.summary}</p>
          : null}
      </CardContent>
    </Card>
  );
}

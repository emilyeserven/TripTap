import type { Tutor } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";

import { Card, CardContent } from "@/components/ui/card";

/** Compact list-item for one tutor: name link and a snippet of notes. */
export function TutorCard({
  tutor,
  onDelete,
}: {
  tutor: Tutor;
  onDelete: (id: string) => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            to="/tutors/$id"
            params={{
              id: tutor.id,
            }}
            className="
              text-lg font-semibold
              hover:underline
            "
          >
            {tutor.name}
          </Link>
          <button
            type="button"
            className="
              text-sm text-destructive
              hover:underline
            "
            onClick={() => onDelete(tutor.id)}
          >
            Delete
          </button>
        </div>
        {tutor.notes
          ? <p className="line-clamp-2 text-sm text-muted-foreground">{tutor.notes}</p>
          : null}
      </CardContent>
    </Card>
  );
}

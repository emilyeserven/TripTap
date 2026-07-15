import type { Tutor } from "@sentence-bank/types";

import { useLessons } from "@/hooks/useLessons";

/** Read-only view of a tutor: name, notes, and how many lessons reference it. */
export function TutorView({
  tutor,
}: {
  tutor: Tutor;
}) {
  const {
    data: lessons,
  } = useLessons(tutor.id);
  const count = lessons?.length ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xl font-semibold">{tutor.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {count} {count === 1 ? "lesson" : "lessons"}
        </p>
      </div>
      {tutor.notes
        ? <p className="text-sm whitespace-pre-wrap">{tutor.notes}</p>
        : <p className="text-sm text-muted-foreground italic">No notes.</p>}
    </div>
  );
}

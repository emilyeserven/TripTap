import type { Lesson } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useTutors } from "@/hooks/useTutors";

/** Compact list-item for one lesson: title/date link, tutor, and note counts. */
export function LessonCard({
  lesson,
  onDelete,
}: {
  lesson: Lesson;
  onDelete: (id: string) => void;
}) {
  const tutors = useTutors();
  const tutor = (tutors.data ?? []).find(t => t.id === lesson.tutorId);
  const listeningCount = lesson.listeningNotes?.length ?? 0;
  const wordCount = lesson.wordNotes?.length ?? 0;
  const sheetCount = lesson.answerSheetIds?.length ?? 0;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            to="/lessons/$id"
            params={{
              id: lesson.id,
            }}
            className="
              text-lg font-semibold
              hover:underline
            "
          >
            {lesson.title ?? lesson.date}
          </Link>
          <button
            type="button"
            className="
              text-sm text-destructive
              hover:underline
            "
            onClick={() => onDelete(lesson.id)}
          >
            Delete
          </button>
        </div>
        <div
          className="
            flex flex-wrap items-center gap-2 text-xs text-muted-foreground
          "
        >
          <span>{lesson.date}</span>
          {tutor ? <span>· {tutor.name}</span> : null}
          {listeningCount > 0
            ? (
              <Badge variant="secondary">
                {listeningCount} {listeningCount === 1 ? "listening note" : "listening notes"}
              </Badge>
            )
            : null}
          {wordCount > 0
            ? (
              <Badge variant="secondary">
                {wordCount} {wordCount === 1 ? "word" : "words"}
              </Badge>
            )
            : null}
          {sheetCount > 0
            ? (
              <Badge variant="outline">
                {sheetCount} {sheetCount === 1 ? "answer sheet" : "answer sheets"}
              </Badge>
            )
            : null}
        </div>
      </CardContent>
    </Card>
  );
}

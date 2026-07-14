import type { Lesson } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useTutors } from "@/hooks/useTutors";

/** Compact list-item for one lesson: title/date link, tutor, and note counts. */
export function LessonCard({
  lesson,
}: {
  lesson: Lesson;
}) {
  const tutors = useTutors();
  const tutor = (tutors.data ?? []).find(t => t.id === lesson.tutorId);
  const listeningCount = lesson.listeningNotes?.length ?? 0;
  const wordCount = lesson.wordNotes?.length ?? 0;
  const sheetCount = lesson.answerSheetIds?.length ?? 0;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
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

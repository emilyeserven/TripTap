import type { Lesson } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";

import { Markdown } from "@/components/Markdown";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useAnswerSheets } from "@/hooks/useAnswerSheets";
import { useTutors } from "@/hooks/useTutors";

/** Read-only view of a lesson: notes, tutor, listening notes, word notes, and linked answer sheets. */
export function LessonView({
  lesson,
}: {
  lesson: Lesson;
}) {
  const tutors = useTutors();
  const answerSheets = useAnswerSheets();
  const tutor = (tutors.data ?? []).find(t => t.id === lesson.tutorId);
  const linked = (lesson.answerSheetIds ?? [])
    .map(id => (answerSheets.data ?? []).find(a => a.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  const listeningNotes = lesson.listeningNotes ?? [];
  const wordNotes = lesson.wordNotes ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xl font-semibold">{lesson.title ?? lesson.date}</p>
        <div
          className="
            mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground
          "
        >
          <span>{lesson.date}</span>
          {tutor
            ? (
              <Link
                to="/tutors/$id"
                params={{
                  id: tutor.id,
                }}
                className="hover:text-foreground"
              >
                {tutor.name}
              </Link>
            )
            : null}
          <Badge variant="secondary">{lesson.language}</Badge>
        </div>
      </div>

      {lesson.notes
        ? (
          <div className="space-y-2">
            <Label>Notes</Label>
            <Markdown content={lesson.notes} />
          </div>
        )
        : null}

      <div className="space-y-2">
        <Label>Listening notes</Label>
        {listeningNotes.length === 0
          ? <p className="text-sm text-muted-foreground">No listening notes.</p>
          : (
            <ul className="divide-y rounded-md border">
              {listeningNotes.map(note => (
                <li
                  key={note.id}
                  className="p-2 wrap-break-word"
                >
                  {note.text}
                  {note.context && (
                    <span className="ml-2 text-sm text-muted-foreground">{note.context}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
      </div>

      <div className="space-y-2">
        <Label>Word notes</Label>
        {wordNotes.length === 0
          ? <p className="text-sm text-muted-foreground">No word notes.</p>
          : (
            <ul className="space-y-2">
              {wordNotes.map(w => (
                <li
                  key={w.id}
                  className="space-y-1 rounded-md border p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {w.word ? <span className="text-base font-medium">{w.word}</span> : null}
                    {w.reading
                      ? <span className="text-sm text-muted-foreground">{w.reading}</span>
                      : null}
                    <Badge variant="outline">
                      {w.status === "shaky" ? "Shaky" : "Didn't know"}
                    </Badge>
                    {w.flashcard ? <Badge variant="secondary">Flashcard</Badge> : null}
                  </div>
                  {w.meaning ? <p className="text-sm">{w.meaning}</p> : null}
                  {w.notes
                    ? (
                      <p
                        className="
                          text-sm whitespace-pre-wrap text-muted-foreground
                        "
                      >{w.notes}
                      </p>
                    )
                    : null}
                </li>
              ))}
            </ul>
          )}
      </div>

      <div className="space-y-2">
        <Label>Answer sheets</Label>
        {linked.length === 0
          ? <p className="text-sm text-muted-foreground">None linked.</p>
          : (
            <ul className="flex flex-wrap gap-2">
              {linked.map(a => (
                <li key={a.id}>
                  <Link
                    to="/answer-sheets/$id"
                    params={{
                      id: a.id,
                    }}
                  >
                    <Badge
                      variant="outline"
                      className="hover:bg-accent"
                    >
                      {a.title ?? "Answer sheet"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
      </div>
    </div>
  );
}

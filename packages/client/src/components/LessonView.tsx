import type { LessonSection } from "@/components/LessonSections";
import type { Lesson } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";

import { LessonMySentences } from "@/components/LessonMySentences";
import { LessonSections } from "@/components/LessonSections";
import { NotesHighlightMenu } from "@/components/NotesHighlightMenu";
import { Badge } from "@/components/ui/badge";
import { useAnswerSheets } from "@/hooks/useAnswerSheets";
import { useTutors } from "@/hooks/useTutors";
import { WORD_COLUMN_CLASS } from "@/lib/lessonLayout";
import { useDisplayStore } from "@/stores/displayStore";

/**
 * Read-only view of a lesson: notes, tutor, word notes, linked answer sheets, and My Sentences. The
 * sections render as bordered collapsible cards or as a tabbed switcher, and the word notes wrap into
 * 1–3 columns — both driven by the lesson's local View options (display store, shared with the editor).
 */
export function LessonView({
  lesson,
}: {
  lesson: Lesson;
}) {
  const tutors = useTutors();
  const answerSheets = useAnswerSheets();
  const wordColumns = useDisplayStore(s => s.lessonWordColumns);

  const tutor = (tutors.data ?? []).find(t => t.id === lesson.tutorId);
  const linked = (lesson.answerSheetIds ?? [])
    .map(id => (answerSheets.data ?? []).find(a => a.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  const wordNotes = lesson.wordNotes ?? [];

  const sections: LessonSection[] = [];

  if (lesson.notes) {
    sections.push({
      id: "notes",
      title: "Notes",
      node: <NotesHighlightMenu lesson={lesson} />,
    });
  }

  sections.push({
    id: "words",
    title: "Word notes",
    node: wordNotes.length === 0
      ? <p className="text-sm text-muted-foreground">No word notes.</p>
      : (
        <ul className={WORD_COLUMN_CLASS[wordColumns]}>
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
      ),
  });

  sections.push({
    id: "answer-sheets",
    title: "Answer sheets",
    node: linked.length === 0
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
      ),
  });

  sections.push({
    id: "my-sentences",
    title: "My Sentences",
    node: (
      <LessonMySentences
        lessonId={lesson.id}
        language={lesson.language}
        readOnly
        bare
      />
    ),
  });

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

      <LessonSections sections={sections} />
    </div>
  );
}

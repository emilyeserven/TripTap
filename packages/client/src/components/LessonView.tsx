import type { LessonWordColumns } from "@/stores/displayStore";
import type { Lesson } from "@sentence-bank/types";
import type { ReactNode } from "react";

import { Link } from "@tanstack/react-router";

import { CollapsibleSection } from "@/components/CollapsibleSection";
import { LessonMySentences } from "@/components/LessonMySentences";
import { Markdown } from "@/components/Markdown";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAnswerSheets } from "@/hooks/useAnswerSheets";
import { useTutors } from "@/hooks/useTutors";
import { useDisplayStore } from "@/stores/displayStore";

/** Word-note grid classes per column count — always 1 column when narrow, widening at breakpoints. */
const WORD_COLUMN_CLASS: Record<LessonWordColumns, string> = {
  1: "grid gap-2",
  2: "grid gap-2 sm:grid-cols-2",
  3: `
    grid gap-2
    sm:grid-cols-2
    lg:grid-cols-3
  `,
};

/**
 * Read-only view of a lesson: notes, tutor, listening notes, word notes, linked answer sheets, and My
 * Sentences. The sections render either as stacked collapsible cards or as a tabbed switcher, and the
 * word notes wrap into 1–3 columns — both driven by the lesson's local View options (display store).
 */
export function LessonView({
  lesson,
}: {
  lesson: Lesson;
}) {
  const tutors = useTutors();
  const answerSheets = useAnswerSheets();
  const sectionLayout = useDisplayStore(s => s.lessonSectionLayout);
  const wordColumns = useDisplayStore(s => s.lessonWordColumns);

  const tutor = (tutors.data ?? []).find(t => t.id === lesson.tutorId);
  const linked = (lesson.answerSheetIds ?? [])
    .map(id => (answerSheets.data ?? []).find(a => a.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  const listeningNotes = lesson.listeningNotes ?? [];
  const wordNotes = lesson.wordNotes ?? [];

  const sections: { id: string;
    title: string;
    node: ReactNode; }[] = [];

  if (lesson.notes) {
    sections.push({
      id: "notes",
      title: "Notes",
      node: <Markdown content={lesson.notes} />,
    });
  }

  sections.push({
    id: "listening",
    title: "Listening notes",
    node: listeningNotes.length === 0
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
      ),
  });

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

      {sectionLayout === "tabs"
        ? (
          <Tabs defaultValue={sections[0]?.id}>
            <TabsList className="h-auto flex-wrap">
              {sections.map(s => (
                <TabsTrigger
                  key={s.id}
                  value={s.id}
                >
                  {s.title}
                </TabsTrigger>
              ))}
            </TabsList>
            {sections.map(s => (
              <TabsContent
                key={s.id}
                value={s.id}
              >
                {s.node}
              </TabsContent>
            ))}
          </Tabs>
        )
        : sections.map(s => (
          <CollapsibleSection
            key={s.id}
            title={s.title}
          >
            {s.node}
          </CollapsibleSection>
        ))}
    </div>
  );
}

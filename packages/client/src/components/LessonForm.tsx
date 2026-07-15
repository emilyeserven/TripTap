import type {
  Lesson,
  LessonListeningNote,
  LessonWordNote,
} from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { LessonListeningNotes } from "@/components/LessonListeningNotes";
import { LessonMySentences } from "@/components/LessonMySentences";
import { LessonWordNotes } from "@/components/LessonWordNotes";
import { TutorPicker } from "@/components/TutorPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Textarea } from "@/components/ui/textarea";
import { useAnswerSheets } from "@/hooks/useAnswerSheets";
import { useAutosave } from "@/hooks/useAutosave";
import { useUpdateLesson } from "@/hooks/useLessons";

/** A word note is worth keeping if any of word/reading/meaning/notes has content. */
function isWordNoteFilled(w: LessonWordNote): boolean {
  return Boolean(w.word?.trim())
    || Boolean(w.reading?.trim())
    || Boolean(w.meaning?.trim())
    || Boolean(w.notes?.trim());
}

const SAVE_LABEL: Record<string, string> = {
  idle: "",
  saving: "Saving…",
  saved: "All changes saved",
};

/**
 * The lesson editor. A lesson is created up front (minimal date) so it always has an id here; this
 * form then **autosaves** every change — scalar fields flush on blur, nested editors save on change
 * (debounced) — so there is no Save button. My Sentences are added inline at the bottom.
 */
export function LessonForm({
  lesson,
}: {
  lesson: Lesson;
}) {
  const update = useUpdateLesson();
  const answerSheets = useAnswerSheets();

  const [title, setTitle] = useState(lesson.title ?? "");
  const [date, setDate] = useState(lesson.date);
  const [language, setLanguage] = useState(lesson.language);
  const [tutorId, setTutorId] = useState<string | null>(lesson.tutorId ?? null);
  const [notes, setNotes] = useState(lesson.notes ?? "");
  const [listeningNotes, setListeningNotes] = useState<LessonListeningNote[]>(
    lesson.listeningNotes ?? [],
  );
  const [wordNotes, setWordNotes] = useState<LessonWordNote[]>(lesson.wordNotes ?? []);
  const [answerSheetIds, setAnswerSheetIds] = useState<string[]>(lesson.answerSheetIds ?? []);

  const input = useMemo(() => {
    const cleanNotes = listeningNotes
      .filter(n => n.text.trim().length > 0)
      .map(n => ({
        ...n,
        text: n.text.trim(),
        context: n.context?.trim() || null,
      }));
    const cleanWords = wordNotes
      .filter(isWordNoteFilled)
      .map(w => ({
        ...w,
        word: w.word?.trim() || null,
        reading: w.reading?.trim() || null,
        meaning: w.meaning?.trim() || null,
        notes: w.notes?.trim() || null,
      }));
    return {
      title: title.trim() || null,
      date,
      language: language.trim() || "Japanese",
      tutorId,
      notes: notes.trim() || null,
      listeningNotes: cleanNotes.length > 0 ? cleanNotes : null,
      wordNotes: cleanWords.length > 0 ? cleanWords : null,
      answerSheetIds: answerSheetIds.length > 0 ? answerSheetIds : null,
    };
  }, [title, date, language, tutorId, notes, listeningNotes, wordNotes, answerSheetIds]);

  const {
    status, flush,
  } = useAutosave(input, i => update.mutateAsync({
    id: lesson.id,
    input: i,
  }));

  return (
    <form
      className="space-y-6"
      onSubmit={e => e.preventDefault()}
    >
      <div className="flex h-4 items-center justify-end">
        <span className="text-xs text-muted-foreground">{SAVE_LABEL[status]}</span>
      </div>

      <div
        className="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <div className="space-y-1.5">
          <Label htmlFor="lesson-date">Date</Label>
          <Input
            id="lesson-date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            onBlur={flush}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lesson-language">Language</Label>
          <Input
            id="lesson-language"
            value={language}
            onChange={e => setLanguage(e.target.value)}
            onBlur={flush}
          />
        </div>
      </div>

      <div
        className="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <div className="space-y-1.5">
          <Label htmlFor="lesson-title">Title (optional)</Label>
          <Input
            id="lesson-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={flush}
            placeholder="Defaults to the date"
          />
        </div>
        <TutorPicker
          value={tutorId}
          onChange={setTutorId}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lesson-notes">Notes (Markdown)</Label>
        <p className="text-xs text-muted-foreground">
          General notes for the lesson. Markdown is supported.
        </p>
        <Textarea
          id="lesson-notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={flush}
          placeholder="# Topics&#10;- …"
          rows={4}
        />
      </div>

      <LessonListeningNotes
        notes={listeningNotes}
        onChange={setListeningNotes}
      />

      <LessonWordNotes
        wordNotes={wordNotes}
        onChange={setWordNotes}
      />

      <div className="space-y-1.5">
        <Label>Answer sheets</Label>
        <p className="text-xs text-muted-foreground">
          Link any answer sheets you worked through in this lesson.
        </p>
        <MultiSelect
          value={answerSheetIds}
          onChange={setAnswerSheetIds}
          options={(answerSheets.data ?? []).map(a => ({
            value: a.id,
            label: a.title ?? "Answer sheet",
          }))}
          ariaLabel="Answer sheets"
          placeholder={answerSheets.isLoading ? "Loading…" : "Select answer sheets…"}
          className="w-full max-w-md"
        />
      </div>

      <LessonMySentences
        lessonId={lesson.id}
        language={lesson.language}
      />
    </form>
  );
}

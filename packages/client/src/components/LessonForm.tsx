import type { LessonSection } from "@/components/LessonSections";
import type { Lesson, LessonWordNote } from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { LessonMySentences } from "@/components/LessonMySentences";
import { LessonSections } from "@/components/LessonSections";
import { LessonWordNotes } from "@/components/LessonWordNotes";
import { NotesEditor } from "@/components/NotesEditor";
import { TutorPicker } from "@/components/TutorPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
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
 * (debounced) — so there is no Save button. Sections render as cards or tabs per the shared View
 * options (same pref as the view page).
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
  const [wordNotes, setWordNotes] = useState<LessonWordNote[]>(lesson.wordNotes ?? []);
  const [answerSheetIds, setAnswerSheetIds] = useState<string[]>(lesson.answerSheetIds ?? []);
  const [durationMinutes, setDurationMinutes] = useState(String(lesson.durationMinutes ?? 0));

  const input = useMemo(() => {
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
      wordNotes: cleanWords.length > 0 ? cleanWords : null,
      answerSheetIds: answerSheetIds.length > 0 ? answerSheetIds : null,
      durationMinutes: Math.max(0, Math.trunc(Number(durationMinutes) || 0)),
    };
  }, [title, date, language, tutorId, notes, wordNotes, answerSheetIds, durationMinutes]);

  const {
    status, flush,
  } = useAutosave(input, i => update.mutateAsync({
    id: lesson.id,
    input: i,
  }));

  const sections: LessonSection[] = [
    {
      id: "notes",
      title: "Notes (Markdown)",
      description: "General notes for the lesson. Highlight text to capture a word card, prompt, or sentence.",
      node: (
        <NotesEditor
          notesMarkdown={notes}
          editable
          onChange={setNotes}
          lesson={lesson}
        />
      ),
    },
    {
      id: "words",
      title: "Word notes",
      description: "Every field is optional — fill in whatever you know. Reading is kana-only.",
      node: (
        <LessonWordNotes
          bare
          wordNotes={wordNotes}
          onChange={setWordNotes}
        />
      ),
    },
    {
      id: "answer-sheets",
      title: "Answer sheets",
      description: "Link any answer sheets you worked through in this lesson.",
      node: (
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
      ),
    },
    {
      id: "my-sentences",
      title: "My Sentences",
      node: (
        <LessonMySentences
          bare
          lessonId={lesson.id}
          language={lesson.language}
        />
      ),
    },
  ];

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
        <Label htmlFor="lesson-duration">Session length (minutes)</Label>
        <p className="text-xs text-muted-foreground">
          Earns 0.25 XP per minute toward each of Speaking, Listening, and Grammar.
        </p>
        <Input
          id="lesson-duration"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          className="w-32"
          value={durationMinutes}
          onChange={e => setDurationMinutes(e.target.value)}
          onBlur={flush}
        />
      </div>

      <LessonSections sections={sections} />
    </form>
  );
}

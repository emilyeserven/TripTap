import type {
  Lesson,
  LessonListeningNote,
  LessonWordNote,
} from "@sentence-bank/types";

import { useState } from "react";

import { LessonListeningNotes } from "@/components/LessonListeningNotes";
import { LessonWordNotes } from "@/components/LessonWordNotes";
import { TutorPicker } from "@/components/TutorPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { useAnswerSheets } from "@/hooks/useAnswerSheets";
import { useCreateLesson, useUpdateLesson } from "@/hooks/useLessons";

/** Today as a "YYYY-MM-DD" string for the default lesson date. */
function todayIso(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

/** A word note is worth keeping if any of word/reading/meaning/notes has content. */
function isWordNoteFilled(w: LessonWordNote): boolean {
  return Boolean(w.word?.trim())
    || Boolean(w.reading?.trim())
    || Boolean(w.meaning?.trim())
    || Boolean(w.notes?.trim());
}

/**
 * Create/edit form for a lesson. The learner records the date, the tutor, notes taken while listening
 * (kana-capable, no timestamps), word notes (every field optional), and links to the answer sheets
 * worked through. One component powers both the new and edit pages — pass a `lesson` to edit an
 * existing one.
 */
export function LessonForm({
  lesson,
  onSuccess,
}: {
  lesson?: Lesson;
  onSuccess?: (id: string) => void;
}) {
  const create = useCreateLesson();
  const update = useUpdateLesson();
  const editing = lesson !== undefined;
  const answerSheets = useAnswerSheets();

  const [title, setTitle] = useState(lesson?.title ?? "");
  const [date, setDate] = useState(lesson?.date ?? todayIso());
  const [language, setLanguage] = useState(lesson?.language ?? "Japanese");
  const [tutorId, setTutorId] = useState<string | null>(lesson?.tutorId ?? null);
  const [listeningNotes, setListeningNotes] = useState<LessonListeningNote[]>(
    lesson?.listeningNotes ?? [],
  );
  const [wordNotes, setWordNotes] = useState<LessonWordNote[]>(lesson?.wordNotes ?? []);
  const [answerSheetIds, setAnswerSheetIds] = useState<string[]>(lesson?.answerSheetIds ?? []);

  const pending = create.isPending || update.isPending;
  const canSubmit = date.trim().length > 0 && language.trim().length > 0 && !pending;

  const submit = async () => {
    if (!canSubmit) return;
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
    const input = {
      title: title.trim() || null,
      date,
      language: language.trim(),
      tutorId,
      listeningNotes: cleanNotes.length > 0 ? cleanNotes : null,
      wordNotes: cleanWords.length > 0 ? cleanWords : null,
      answerSheetIds: answerSheetIds.length > 0 ? answerSheetIds : null,
    };
    const saved = editing
      ? await update.mutateAsync({
        id: lesson.id,
        input,
      })
      : await create.mutateAsync(input);
    onSuccess?.(saved.id);
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
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
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lesson-language">Language</Label>
          <Input
            id="lesson-language"
            value={language}
            onChange={e => setLanguage(e.target.value)}
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
            placeholder="Defaults to the date"
          />
        </div>
        <TutorPicker
          value={tutorId}
          onChange={setTutorId}
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

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={!canSubmit}
        >
          {pending
            ? "Saving…"
            : editing
              ? "Save changes"
              : "Create lesson"}
        </Button>
      </div>
    </form>
  );
}

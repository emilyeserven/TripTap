import type {
  ReadingLine,
  ReadingSession,
  ReadingTranslationMode,
  WordNote,
} from "@sentence-bank/types";

import { useState } from "react";

import { ReadingLineEditor } from "@/components/ReadingLineEditor";
import { ReadingWordNotesEditor } from "@/components/ReadingWordNotesEditor";
import { SourcePicker } from "@/components/SourcePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateReadingSession,
  useUpdateReadingSession,
} from "@/hooks/useReadingSessions";
import { todayDateString } from "@/lib/daily-lineup";

/**
 * Create/edit form for a reading session. The learner records where the passage came from, then
 * translates it in one of two modes (a freeform block or line-by-line, split from a paste box), with
 * an optional whole-passage summary. Below the mode tabs is a flat editor for words they were shaky on
 * or didn't know, each optionally flagged for a flashcard list later. One component powers both the
 * new and edit pages — pass a `session` to edit an existing one.
 */
export function ReadingSessionForm({
  session,
  initialTitle,
  onSuccess,
}: {
  session?: ReadingSession;
  /** Prefill the title on a new session (e.g. started from a Collections item); ignored when editing. */
  initialTitle?: string;
  onSuccess?: (id: string) => void;
}) {
  const create = useCreateReadingSession();
  const update = useUpdateReadingSession();
  const editing = session !== undefined;

  const [date, setDate] = useState(session?.date ?? todayDateString(new Date()));
  const [title, setTitle] = useState(session?.title ?? initialTitle ?? "");
  const [language, setLanguage] = useState(session?.language ?? "Japanese");
  const [sourceId, setSourceId] = useState<string | null>(session?.sourceId ?? null);
  const [page, setPage] = useState(session?.page ?? "");
  const [mode, setMode] = useState<ReadingTranslationMode>(session?.mode ?? "freeform");
  const [passage, setPassage] = useState(session?.passage ?? "");
  const [freeformTranslation, setFreeformTranslation] = useState(
    session?.freeformTranslation ?? "",
  );
  const [summary, setSummary] = useState(session?.summary ?? "");
  const [lines, setLines] = useState<ReadingLine[]>(session?.lines ?? []);
  const [wordNotes, setWordNotes] = useState<WordNote[]>(session?.wordNotes ?? []);

  const pending = create.isPending || update.isPending;
  const canSubmit = title.trim().length > 0 && language.trim().length > 0 && !pending;

  const submit = async () => {
    if (!canSubmit) return;
    const cleanLines = lines.map(l => ({
      ...l,
      translation: l.translation?.trim() || null,
      correction: l.correction?.trim() || null,
    }));
    const cleanWords = wordNotes
      .filter(w => w.word.trim().length > 0)
      .map(w => ({
        ...w,
        word: w.word.trim(),
        reading: w.reading?.trim() || null,
        meaning: w.meaning?.trim() || null,
      }));
    const input = {
      date,
      title: title.trim(),
      language: language.trim(),
      sourceId,
      page: page.trim() || null,
      mode,
      passage: passage.trim() || null,
      freeformTranslation: freeformTranslation.trim() || null,
      summary: summary.trim() || null,
      lines: cleanLines.length > 0 ? cleanLines : null,
      wordNotes: cleanWords.length > 0 ? cleanWords : null,
    };
    const saved = editing
      ? await update.mutateAsync({
        id: session.id,
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
          space-y-1.5
          sm:max-w-xs
        "
      >
        <Label htmlFor="rs-date">Date</Label>
        <Input
          id="rs-date"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      <div
        className="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <div className="space-y-1.5">
          <Label htmlFor="rs-title">Title</Label>
          <Input
            id="rs-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Chapter 3 — first read"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rs-language">Language</Label>
          <Input
            id="rs-language"
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
        <SourcePicker
          value={sourceId}
          onChange={setSourceId}
        />
        <div className="space-y-1.5">
          <Label htmlFor="rs-page">Where from (page / location)</Label>
          <Input
            id="rs-page"
            value={page}
            onChange={e => setPage(e.target.value)}
            placeholder="p. 12–13, ch. 3, …"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rs-summary">Summary (optional)</Label>
        <Textarea
          id="rs-summary"
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="A quick gist of the whole passage, when a literal translation isn't worth it."
          rows={2}
        />
      </div>

      <Tabs
        value={mode}
        onValueChange={v => setMode(v as ReadingTranslationMode)}
      >
        <TabsList>
          <TabsTrigger value="freeform">Freeform translation</TabsTrigger>
          <TabsTrigger value="line-by-line">Line by line</TabsTrigger>
        </TabsList>

        <TabsContent
          value="freeform"
          className="space-y-4 pt-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="rs-passage">Passage (optional)</Label>
            <Textarea
              id="rs-passage"
              value={passage}
              onChange={e => setPassage(e.target.value)}
              placeholder="The original text you read."
              rows={5}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rs-translation">Your translation</Label>
            <Textarea
              id="rs-translation"
              value={freeformTranslation}
              onChange={e => setFreeformTranslation(e.target.value)}
              placeholder="Translate the passage in your own words."
              rows={6}
            />
          </div>
        </TabsContent>

        <TabsContent
          value="line-by-line"
          className="space-y-4 pt-4"
        >
          <ReadingLineEditor
            lines={lines}
            onChange={setLines}
          />
        </TabsContent>
      </Tabs>

      <ReadingWordNotesEditor
        wordNotes={wordNotes}
        onChange={setWordNotes}
      />

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={!canSubmit}
        >
          {pending
            ? "Saving…"
            : editing
              ? "Save changes"
              : "Create reading session"}
        </Button>
      </div>
    </form>
  );
}

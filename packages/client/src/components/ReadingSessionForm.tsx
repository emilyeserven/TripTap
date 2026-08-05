import type {
  BookmarkSectionRef,
  LearningArea,
  ReadingDifficulty,
  ReadingLine,
  ReadingSession,
  ReadingTranslationMode,
  TranslationVerdict,
  WordNote,
} from "@sentence-bank/types";

import { useState } from "react";

import { BookmarkPicker } from "@/components/BookmarkPicker";
import { ReadingDifficultyPicker } from "@/components/ReadingDifficultyPicker";
import { ReadingLineEditor } from "@/components/ReadingLineEditor";
import { ReadingWordNotesEditor } from "@/components/ReadingWordNotesEditor";
import { SessionXpFields } from "@/components/SessionXpFields";
import { TranslationVerdictPicker } from "@/components/TranslationVerdictPicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateReadingSession,
  useUpdateReadingSession,
} from "@/hooks/useReadingSessions";
import { todayDateString } from "@/lib/daily-lineup";
import { blockEnterSubmit } from "@/lib/forms";

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
  initialBookmark,
  initialSection,
  onSuccess,
}: {
  session?: ReadingSession;
  /** Prefill the title on a new session (e.g. started from a Collections item); ignored when editing. */
  initialTitle?: string;
  /** Seed a brand-new session from a bookmark resource (e.g. from Start Something); ignored when editing. */
  initialBookmark?: { id: string;
    title: string;
    url: string | null; };
  /** Preselect a specific section of {@link initialBookmark}; ignored when editing. */
  initialSection?: BookmarkSectionRef | null;
  onSuccess?: (id: string) => void;
}) {
  const create = useCreateReadingSession();
  const update = useUpdateReadingSession();
  const editing = session !== undefined;

  const [date, setDate] = useState(session?.date ?? todayDateString(new Date()));
  const [title, setTitle] = useState(session?.title ?? initialTitle ?? "");
  const [language, setLanguage] = useState(session?.language ?? "Japanese");
  // Source was retired in favour of the Resource picker; preserve any existing value on edit, but
  // it's no longer user-editable.
  const sourceId = session?.sourceId ?? null;
  const [page, setPage] = useState(session?.page ?? "");
  const [difficulty, setDifficulty] = useState<ReadingDifficulty | null>(
    session?.difficulty ?? "medium",
  );
  // A passive session is just "I read for N minutes" — no translation or word notes; it earns XP by
  // the minute (still scaled by difficulty).
  const [passive, setPassive] = useState(session?.passive ?? false);
  const [timeSpentMinutes, setTimeSpentMinutes] = useState(
    session?.timeSpentMinutes ? String(session.timeSpentMinutes) : "",
  );
  const [mode, setMode] = useState<ReadingTranslationMode>(session?.mode ?? "freeform");
  const [passage, setPassage] = useState(session?.passage ?? "");
  const [freeformTranslation, setFreeformTranslation] = useState(
    session?.freeformTranslation ?? "",
  );
  const [freeformCorrection, setFreeformCorrection] = useState(
    session?.freeformCorrection ?? "",
  );
  const [freeformNote, setFreeformNote] = useState(session?.freeformNote ?? "");
  const [freeformVerdict, setFreeformVerdict] = useState<TranslationVerdict | null>(
    session?.freeformVerdict ?? null,
  );
  const [summary, setSummary] = useState(session?.summary ?? "");
  const [lines, setLines] = useState<ReadingLine[]>(session?.lines ?? []);
  const [wordNotes, setWordNotes] = useState<WordNote[]>(session?.wordNotes ?? []);
  const [bookmarkId, setBookmarkId] = useState(session?.bookmarkId ?? initialBookmark?.id ?? null);
  const [bookmarkTitle, setBookmarkTitle] = useState(
    session?.bookmarkTitle ?? initialBookmark?.title ?? null,
  );
  const [bookmarkUrl, setBookmarkUrl] = useState(session?.bookmarkUrl ?? initialBookmark?.url ?? null);
  const [section, setSection] = useState<BookmarkSectionRef | null>(
    session?.section ?? initialSection ?? null,
  );

  const [learningArea, setLearningArea] = useState<LearningArea | null>(
    session?.learningArea ?? null,
  );
  const [countsTowardXp, setCountsTowardXp] = useState(session?.countsTowardXp ?? true);

  const pending = create.isPending || update.isPending;
  const canSubmit = title.trim().length > 0 && language.trim().length > 0 && !pending;

  const submit = async () => {
    if (!canSubmit) return;
    const cleanLines = lines.map(l => ({
      ...l,
      translation: l.translation?.trim() || null,
      correction: l.correction?.trim() || null,
      note: l.note?.trim() || null,
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
      learningArea: countsTowardXp ? learningArea : null,
      countsTowardXp,
      date,
      title: title.trim(),
      language: language.trim(),
      sourceId,
      page: page.trim() || null,
      mode,
      difficulty,
      passive,
      // Only a passive session carries minutes; clamp to a non-negative whole number.
      timeSpentMinutes: passive ? Math.max(0, Math.trunc(Number(timeSpentMinutes) || 0)) : 0,
      passage: passage.trim() || null,
      freeformTranslation: freeformTranslation.trim() || null,
      freeformCorrection: freeformCorrection.trim() || null,
      freeformNote: freeformNote.trim() || null,
      freeformVerdict,
      summary: summary.trim() || null,
      lines: cleanLines.length > 0 ? cleanLines : null,
      wordNotes: cleanWords.length > 0 ? cleanWords : null,
      bookmarkId,
      bookmarkTitle,
      bookmarkUrl,
      section,
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
          onKeyDown={blockEnterSubmit}
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
            onKeyDown={blockEnterSubmit}
            placeholder="Chapter 3 — first read"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rs-language">Language</Label>
          <Input
            id="rs-language"
            value={language}
            onChange={e => setLanguage(e.target.value)}
            onKeyDown={blockEnterSubmit}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rs-page">Where from (page / location)</Label>
        <Input
          id="rs-page"
          value={page}
          onChange={e => setPage(e.target.value)}
          onKeyDown={blockEnterSubmit}
          placeholder="p. 12–13, ch. 3, …"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Difficulty</Label>
        <p className="text-xs text-muted-foreground">
          How hard the reading felt — scales the XP this session earns.
        </p>
        <ReadingDifficultyPicker
          value={difficulty}
          onChange={setDifficulty}
        />
      </div>

      <div className="space-y-2 rounded-md border p-3">
        <label className="flex items-start gap-2">
          <Checkbox
            checked={passive}
            onCheckedChange={next => setPassive(next === true)}
            aria-label="Passive reading session"
          />
          <span className="space-y-0.5">
            <span className="block text-sm font-medium">Passive session</span>
            <span className="block text-xs text-muted-foreground">
              Just reading, no translation or word notes. Earns XP by the minute (scaled by difficulty)
              instead of per translation.
            </span>
          </span>
        </label>
        {passive && (
          <div
            className="
              space-y-1.5 pl-6
              sm:max-w-xs
            "
          >
            <Label htmlFor="rs-minutes">Minutes read</Label>
            <Input
              id="rs-minutes"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={timeSpentMinutes}
              onChange={e => setTimeSpentMinutes(e.target.value)}
            />
          </div>
        )}
      </div>

      <BookmarkPicker
        selectedBookmarkId={bookmarkId}
        selectedBookmarkTitle={bookmarkTitle}
        label="Resource (optional)"
        onPick={(record) => {
          setBookmarkId(record?.id ?? null);
          setBookmarkTitle(record?.title ?? null);
          setBookmarkUrl(record?.url ?? null);
          // Picking a different resource clears any previously chosen section.
          setSection(null);
        }}
        enableSections
        selectedSection={section}
        onPickSection={setSection}
      />

      {!passive && (
        <Tabs
          value={mode}
          onValueChange={v => setMode(v as ReadingTranslationMode)}
        >
          <TabsList>
            <TabsTrigger value="freeform">Freeform translation</TabsTrigger>
            <TabsTrigger value="line-by-line">Line by line</TabsTrigger>
            <TabsTrigger value="summary">Just summarize</TabsTrigger>
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
            <div className="space-y-1.5">
              <Label>How did the translation go?</Label>
              <TranslationVerdictPicker
                value={freeformVerdict}
                onChange={setFreeformVerdict}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-freeform-correction">Reference translation (optional)</Label>
              <Textarea
                id="rs-freeform-correction"
                value={freeformCorrection}
                onChange={e => setFreeformCorrection(e.target.value)}
                placeholder="The reference translation to compare against."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-freeform-note">Comment on the translation (optional)</Label>
              <Textarea
                id="rs-freeform-note"
                value={freeformNote}
                onChange={e => setFreeformNote(e.target.value)}
                placeholder="A note on what was off and why."
                rows={2}
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

          <TabsContent
            value="summary"
            className="space-y-4 pt-4"
          >
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
          </TabsContent>
        </Tabs>
      )}

      {!passive && (
        <ReadingWordNotesEditor
          wordNotes={wordNotes}
          onChange={setWordNotes}
          language={language}
        />
      )}

      <SessionXpFields
        learningArea={learningArea}
        onLearningAreaChange={setLearningArea}
        countsTowardXp={countsTowardXp}
        onCountsTowardXpChange={setCountsTowardXp}
        defaultArea="Reading"
        noun="reading session"
        idPrefix="rs"
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

import type {
  ReadingLine,
  ReadingSession,
  ReadingTranslationMode,
  WordNote,
} from "@sentence-bank/types";

import { useState } from "react";

import { Plus, Trash2 } from "lucide-react";

import { SourcePicker } from "@/components/SourcePicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { WordNoteControls } from "@/components/WordNoteControls";
import {
  useCreateReadingSession,
  useUpdateReadingSession,
} from "@/hooks/useReadingSessions";
import { newId } from "@/lib/id";

/**
 * Create/edit form for a reading session. The learner records where the passage came from, then
 * translates it in one of two modes (a freeform block or line-by-line, split from a paste box), with
 * an optional whole-passage summary. Below the mode tabs is a flat editor for words they were shaky on
 * or didn't know, each optionally flagged for a flashcard list later. One component powers both the
 * new and edit pages — pass a `session` to edit an existing one.
 */
export function ReadingSessionForm({
  session,
  onSuccess,
}: {
  session?: ReadingSession;
  onSuccess?: (id: string) => void;
}) {
  const create = useCreateReadingSession();
  const update = useUpdateReadingSession();
  const editing = session !== undefined;

  const [title, setTitle] = useState(session?.title ?? "");
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
  const [pasteBuffer, setPasteBuffer] = useState("");

  const pending = create.isPending || update.isPending;
  const canSubmit = title.trim().length > 0 && language.trim().length > 0 && !pending;

  // Line-by-line helpers.
  function splitIntoLines() {
    const next = pasteBuffer
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean)
      .map((text): ReadingLine => ({
        id: newId(),
        text,
        translation: null,
        summaryOnly: false,
        correction: null,
        needsCorrection: false,
      }));
    if (next.length) {
      setLines([...lines, ...next]);
      setPasteBuffer("");
    }
  }
  const patchLine = (id: string, patch: Partial<ReadingLine>) =>
    setLines(lines.map(l => (l.id === id
      ? {
        ...l,
        ...patch,
      }
      : l)));
  const removeLine = (id: string) => setLines(lines.filter(l => l.id !== id));

  // Word-note helpers.
  const addWordNote = () =>
    setWordNotes([...wordNotes, {
      id: newId(),
      word: "",
      reading: null,
      meaning: null,
      status: "shaky",
      flashcard: false,
    }]);
  const patchWord = (id: string, patch: Partial<WordNote>) =>
    setWordNotes(wordNotes.map(w => (w.id === id
      ? {
        ...w,
        ...patch,
      }
      : w)));
  const removeWord = (id: string) => setWordNotes(wordNotes.filter(w => w.id !== id));

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
          <div className="space-y-1.5">
            <Label htmlFor="rs-paste">Paste the lines</Label>
            <Textarea
              id="rs-paste"
              value={pasteBuffer}
              onChange={e => setPasteBuffer(e.target.value)}
              placeholder="Paste the passage here, one line per row, then split it into lines below."
              rows={4}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={splitIntoLines}
              disabled={pasteBuffer.trim().length === 0}
            >
              Split into lines
            </Button>
          </div>

          {lines.length === 0
            ? (
              <p className="text-sm text-muted-foreground">
                No lines yet. Paste the passage above and split it into lines.
              </p>
            )
            : (
              <ul className="space-y-3">
                {lines.map(line => (
                  <li
                    key={line.id}
                    className="space-y-2 rounded-md border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-base">{line.text}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => removeLine(line.id)}
                        aria-label="Delete line"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={line.summaryOnly}
                        onCheckedChange={v => patchLine(line.id, {
                          summaryOnly: v === true,
                        })}
                      />
                      Summary only (not a literal translation)
                    </label>
                    <Textarea
                      value={line.translation ?? ""}
                      onChange={e => patchLine(line.id, {
                        translation: e.target.value,
                      })}
                      placeholder={line.summaryOnly ? "Summary of this line" : "Translation of this line"}
                      rows={2}
                      aria-label={line.summaryOnly ? "Line summary" : "Line translation"}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={line.needsCorrection}
                        onCheckedChange={v => patchLine(line.id, {
                          needsCorrection: v === true,
                        })}
                      />
                      Needs correction
                    </label>
                    {line.needsCorrection && (
                      <Textarea
                        value={line.correction ?? ""}
                        onChange={e => patchLine(line.id, {
                          correction: e.target.value,
                        })}
                        placeholder="The corrected translation"
                        rows={2}
                        aria-label="Line correction"
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
        </TabsContent>
      </Tabs>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Word notes</Label>
            <p className="text-xs text-muted-foreground">
              Words you were shaky on or didn’t know. Flag any you want on a flashcard list later.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={addWordNote}
          >
            <Plus className="size-4" />
            Add word
          </Button>
        </div>

        {wordNotes.length === 0
          ? <p className="text-sm text-muted-foreground">No words noted yet.</p>
          : (
            <ul className="space-y-3">
              {wordNotes.map(w => (
                <li
                  key={w.id}
                  className="space-y-2 rounded-md border p-3"
                >
                  <div
                    className="
                      grid gap-2
                      sm:grid-cols-3
                    "
                  >
                    <Input
                      value={w.word}
                      onChange={e => patchWord(w.id, {
                        word: e.target.value,
                      })}
                      placeholder="Word"
                      aria-label="Word"
                    />
                    <Input
                      value={w.reading ?? ""}
                      onChange={e => patchWord(w.id, {
                        reading: e.target.value,
                      })}
                      placeholder="Reading (optional)"
                      aria-label="Reading"
                    />
                    <Input
                      value={w.meaning ?? ""}
                      onChange={e => patchWord(w.id, {
                        meaning: e.target.value,
                      })}
                      placeholder="Meaning (optional)"
                      aria-label="Meaning"
                    />
                  </div>
                  <WordNoteControls
                    status={w.status}
                    flashcard={w.flashcard}
                    onStatusChange={status => patchWord(w.id, {
                      status,
                    })}
                    onFlashcardChange={flashcard => patchWord(w.id, {
                      flashcard,
                    })}
                    onDelete={() => removeWord(w.id)}
                  />
                </li>
              ))}
            </ul>
          )}
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
              : "Create reading session"}
        </Button>
      </div>
    </form>
  );
}

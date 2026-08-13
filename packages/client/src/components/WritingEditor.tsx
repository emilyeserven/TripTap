import type { SentenceTermCategory, SentenceTermRef, UpdateWritingInput, Writing } from "@sentence-bank/types";

import { useEffect, useRef, useState } from "react";

import { Check, LightbulbIcon, SparklesIcon } from "lucide-react";

import { BasketPracticePanel } from "./BasketPracticePanel";
import { CorrectedVersionView } from "./CorrectedVersionView";
import { ShowOriginalToggle } from "./ShowOriginalToggle";
import { TermPicker } from "./TermPicker";
import { WritingCorrections } from "./WritingCorrections";
import { useUpdateWriting } from "../hooks/useWritings";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatWritingDate } from "@/lib/writing-label";

/** The autosaved fields of a writing (corrections are managed separately in correction mode). */
interface Draft {
  title: string;
  date: string;
  text: string;
  meaning: string;
  comments: string;
  language: string;
  readyToReview: boolean;
  terms: SentenceTermRef[];
}

function toDraft(w: Writing): Draft {
  return {
    title: w.title ?? "",
    date: w.date,
    text: w.text,
    meaning: w.meaning ?? "",
    comments: w.comments ?? "",
    language: w.language,
    readyToReview: w.readyToReview,
    terms: w.terms ?? [],
  };
}

function toInput(draft: Draft): UpdateWritingInput {
  return {
    title: draft.title.trim() || null,
    date: draft.date,
    text: draft.text,
    meaning: draft.meaning || null,
    comments: draft.comments || null,
    language: draft.language,
    readyToReview: draft.readyToReview,
    terms: draft.terms.length > 0 ? draft.terms : null,
  };
}

/**
 * One free-form writing entry. There is no Save button: field changes are debounced and PATCHed
 * automatically (a "Saving…/Saved" indicator). Toggle correction mode to fix individual sentences and
 * promote them to My Sentences (see {@link WritingCorrections}).
 */
export function WritingEditor({
  writing,
  onDelete,
}: {
  writing: Writing;
  onDelete?: (id: string) => void;
}) {
  const update = useUpdateWriting();
  const [draft, setDraft] = useState<Draft>(() => toDraft(writing));
  const [status, setStatus] = useState("");
  const [correcting, setCorrecting] = useState(false);
  // When corrections exist the corrected version leads; the original writing is opt-in (and editable).
  const [showOriginal, setShowOriginal] = useState(false);
  const dirty = useRef(false);

  // Debounced autosave — mirrors PracticeSentenceEditor. Corrections aren't in the draft, so this
  // partial PATCH never clobbers them.
  useEffect(() => {
    if (!dirty.current) return;
    setStatus("Saving…");
    const timer = setTimeout(() => {
      update.mutate(
        {
          id: writing.id,
          input: toInput(draft),
        },
        {
          onSuccess: () => {
            setStatus("Saved");
            window.setTimeout(() => setStatus(cur => (cur === "Saved" ? "" : cur)), 1400);
          },
          onError: () => setStatus("Not saved — check your connection"),
        },
      );
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, writing.id]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    dirty.current = true;
    setDraft(d => ({
      ...d,
      [key]: value,
    }));
  };

  const termsFor = (cat: SentenceTermCategory) =>
    draft.terms.filter(t => (t.category ?? "vocabulary") === cat);
  const setTermsFor = (cat: SentenceTermCategory, next: SentenceTermRef[]) =>
    set("terms", [...draft.terms.filter(t => (t.category ?? "vocabulary") !== cat), ...next]);

  const correctionCount = writing.corrections?.length ?? 0;

  const yourWritingField = (
    <div className="space-y-1.5">
      <Label className="text-sm">Your writing</Label>
      <Textarea
        value={draft.text}
        onChange={e => set("text", e.target.value)}
        placeholder="自由に書いてみましょう。今日あったことや、思ったことなど。"
        className="text-lg"
        rows={5}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{draft.language}</Badge>
          {draft.readyToReview ? <Badge variant="outline">Ready to review</Badge> : null}
          {correctionCount > 0
            ? (
              <Badge
                variant="outline"
                className="gap-1"
              >
                <SparklesIcon className="size-3" />
                {correctionCount}
                {" "}
                corrected
              </Badge>
            )
            : null}
        </div>
        <span
          className="flex items-center gap-1.5 text-sm text-muted-foreground"
          aria-live="polite"
        >
          {status === "Saved" ? <Check className="size-4 text-primary" /> : null}
          {status}
        </span>
      </div>

      <div
        className="
          grid gap-4
          sm:grid-cols-[1fr_auto]
        "
      >
        <div className="space-y-1.5">
          <Label
            className="text-sm"
            htmlFor="writing-title"
          >
            Title
          </Label>
          <Input
            id="writing-title"
            value={draft.title}
            onChange={e => set("title", e.target.value)}
            placeholder={`Optional — defaults to ${formatWritingDate(draft.date)}`}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            className="text-sm"
            htmlFor="writing-date"
          >
            Date
          </Label>
          <Input
            id="writing-date"
            type="date"
            value={draft.date}
            onChange={e => set("date", e.target.value)}
          />
        </div>
      </div>

      {correcting
        ? (
          <WritingCorrections
            writing={writing}
            text={draft.text}
          />
        )
        : (
          <div className="space-y-3">
            <BasketPracticePanel />
            {writing.promptText
              ? (
                <div
                  className="rounded-md border border-dashed bg-muted/40 p-3"
                >
                  <p
                    className="
                      flex items-center gap-1.5 text-xs font-medium
                      text-muted-foreground
                    "
                  >
                    <LightbulbIcon className="size-3.5" />
                    Prompt
                    {writing.promptTitle ? `: ${writing.promptTitle}` : null}
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{writing.promptText}</p>
                </div>
              )
              : null}
            {correctionCount > 0
              ? (
                <>
                  <CorrectedVersionView writing={writing} />
                  <ShowOriginalToggle
                    open={showOriginal}
                    onToggle={() => setShowOriginal(o => !o)}
                  />
                  {showOriginal ? yourWritingField : null}
                </>
              )
              : yourWritingField}
          </div>
        )}

      <div
        className="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <div className="space-y-1.5">
          <Label className="text-sm">Intended meaning</Label>
          <Textarea
            value={draft.meaning}
            onChange={e => set("meaning", e.target.value)}
            placeholder="What you were trying to say…"
            rows={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Comments</Label>
          <Textarea
            value={draft.comments}
            onChange={e => set("comments", e.target.value)}
            placeholder="Notes, questions, what you were practicing…"
            rows={2}
          />
        </div>
      </div>

      <div
        className="
          grid gap-4
          sm:grid-cols-3
        "
      >
        <TermPicker
          category="vocabulary"
          label="Vocabulary tags"
          value={termsFor("vocabulary")}
          onChange={next => setTermsFor("vocabulary", next)}
        />
        <TermPicker
          category="grammar"
          label="Grammar tags"
          value={termsFor("grammar")}
          onChange={next => setTermsFor("grammar", next)}
        />
        <TermPicker
          category="general"
          label="General tags"
          value={termsFor("general")}
          onChange={next => setTermsFor("general", next)}
        />
        <TermPicker
          category="resource"
          label="Resources"
          value={termsFor("resource")}
          onChange={next => setTermsFor("resource", next)}
        />
      </div>

      <div
        className="
          flex flex-wrap items-center justify-between gap-3 border-t pt-3
        "
      >
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={draft.readyToReview}
              onCheckedChange={checked => set("readyToReview", checked)}
              aria-label="Ready to review"
            />
            Ready to review
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={correcting}
              onCheckedChange={setCorrecting}
              aria-label="Correction mode"
            />
            Correction mode
          </label>
        </div>
        {onDelete
          ? (
            <Button
              variant="ghost"
              size="sm"
              className="
                text-destructive
                hover:text-destructive
              "
              onClick={() => onDelete(writing.id)}
            >
              Delete
            </Button>
          )
          : null}
      </div>
    </div>
  );
}

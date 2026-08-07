import type { SaveCorrection } from "@/lib/answer-sheets";
import type { AnswerSheetEntry } from "@sentence-bank/types";

import { useState } from "react";

import { Check, Pencil, Plus, X } from "lucide-react";

import { AnswerEntryCorrections } from "@/components/AnswerEntryCorrections";
import { ExplainedSentence } from "@/components/ExplainedSentence";
import { SentenceCorrector } from "@/components/SentenceCorrector";
import { ShowOriginalToggle } from "@/components/ShowOriginalToggle";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { hasCorrectionDetail, isEntryAnswered } from "@/lib/answer-sheets";
import { CorrectionDiff } from "@/lib/sentenceDiff";
import { cn } from "@/lib/utils";

/**
 * One answered slot within a question card (no outer border — the card provides it). Mirrors the My
 * Sentences correction style: the corrected answer leads and the learner's original hides behind an
 * opt-in toggle that reveals a word/char diff.
 *
 * The review controls (✓ Correct / ✗ Wrong / ＋ Note / Edit corrections) sit in a row **directly under**
 * the answer rather than off to the right, so a column of answers scans top-to-bottom without the eye
 * jumping sideways. ✗ Wrong and ＋ Note reveal an inline corrector; the verdict is set explicitly by the
 * ✓ / ✗ buttons (see {@link AnswerSheetView} `saveCorrection`, which only infers a verdict when none is set).
 */
export function AnswerEntry({
  slotId,
  label,
  entry,
  markCorrect,
  markIncorrect,
  editCorrections,
  saveCorrection,
}: {
  slotId: string;
  label: string | null;
  entry: AnswerSheetEntry;
  markCorrect: (slotId: string) => void;
  markIncorrect: (slotId: string) => void;
  editCorrections: (slotId: string) => void;
  saveCorrection: SaveCorrection;
}) {
  const corrected = entry.correction?.trim() ? entry.correction : null;
  const hasCorrections = hasCorrectionDetail(entry);
  // The inline corrector, revealed on demand: "correct" builds a correction, "note" adds an explanation.
  const [correcting, setCorrecting] = useState<false | "correct" | "note">(false);
  const [showOriginal, setShowOriginal] = useState(false);

  if (!isEntryAnswered(entry)) {
    return (
      <p className="text-sm text-muted-foreground">
        {label ? <span className="font-medium">{label} — </span> : null}
        No answer
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {entry.correct === true
          ? <Check className="size-4 shrink-0 text-green-600" />
          : entry.correct === false || corrected
            ? <X className="size-4 shrink-0 text-destructive" />
            : null}
        {label ? <p className="text-sm font-medium">{label}</p> : null}
      </div>

      {!corrected && !entry.value.trim()
        ? (
          <p className="text-base font-normal text-muted-foreground italic">
            No answer
          </p>
        )
        : (
          <ExplainedSentence
            text={corrected ?? entry.value ?? ""}
            explanation={entry.reasoning}
            className="text-xl font-semibold"
          />
        )}

      <AnswerEntryCorrections entry={entry} />

      {corrected
        ? (
          <div className="space-y-1">
            <ShowOriginalToggle
              open={showOriginal}
              onToggle={() => setShowOriginal(v => !v)}
            />
            {showOriginal
              ? (
                <div className="space-y-1 rounded-md border bg-muted/30 p-3">
                  <Label className="text-sm">Your original (with corrections)</Label>
                  <CorrectionDiff
                    written={entry.value}
                    correct={corrected}
                  />
                </div>
              )
              : null}
          </div>
        )
        : null}

      {correcting
        ? (
          <SentenceCorrector
            text={entry.value}
            marks={entry.marks}
            reasoning={entry.reasoning}
            startWithNote={correcting === "note"}
            onSave={(r) => {
              saveCorrection(slotId, r);
              setCorrecting(false);
            }}
          />
        )
        : null}

      {/* Correction controls, directly under the answer so the list scans vertically. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={entry.correct === true}
          className={cn("gap-1", entry.correct === true && "text-green-600")}
          onClick={() => {
            markCorrect(slotId);
            setCorrecting(false);
          }}
        >
          <Check className="size-4" />
          Correct
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={entry.correct === false}
          className={cn("gap-1", entry.correct === false && "text-destructive")}
          onClick={() => {
            markIncorrect(slotId);
            setCorrecting("correct");
          }}
        >
          <X className="size-4" />
          Wrong
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={() => setCorrecting(c => (c === "note" ? false : "note"))}
        >
          <Plus className="size-4" />
          Note
        </Button>
        {hasCorrections
          ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => editCorrections(slotId)}
            >
              <Pencil className="size-4" />
              Edit corrections
            </Button>
          )
          : null}
      </div>
    </div>
  );
}

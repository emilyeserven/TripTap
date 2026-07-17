import type { SaveCorrection } from "@/lib/answer-sheets";
import type { AnswerSheetEntry } from "@sentence-bank/types";

import { useState } from "react";

import { Check, Eye, EyeOff, X } from "lucide-react";

import { AnswerEntryCorrections } from "@/components/AnswerEntryCorrections";
import { AnswerHoverActions } from "@/components/AnswerHoverActions";
import { SentenceCorrector } from "@/components/SentenceCorrector";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { hasCorrectionDetail, isEntryAnswered } from "@/lib/answer-sheets";
import { CorrectionDiff } from "@/lib/sentenceDiff";

/**
 * One answered slot within a question card (no outer border — the card provides it). Mirrors the My
 * Sentences correction style: the corrected answer leads and the learner's original hides behind an
 * opt-in toggle that reveals a word/char diff (shown below the explanation).
 */
export function AnswerEntry({
  slotId,
  label,
  entry,
  markCorrect,
  markWrong,
  editCorrections,
  saveCorrection,
}: {
  slotId: string;
  label: string | null;
  entry: AnswerSheetEntry;
  markCorrect: (slotId: string) => void;
  markWrong: (slotId: string) => void;
  editCorrections: (slotId: string) => void;
  saveCorrection: SaveCorrection;
}) {
  const corrected = entry.correction?.trim() ? entry.correction : null;
  const hasCorrections = hasCorrectionDetail(entry);
  // Un-reviewed = no verdict and no correction yet → offer the inline corrector; once reviewed/corrected
  // the standard corrected-leads display (with the marks under "Show your original") takes over.
  const unreviewed = entry.correct == null && !corrected;
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
    <div className="group space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {entry.correct === true
            ? <Check className="size-4 shrink-0 text-green-600" />
            : entry.correct === false || corrected
              ? <X className="size-4 shrink-0 text-destructive" />
              : null}
          {label ? <p className="text-sm font-medium">{label}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {hasCorrections
            ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => editCorrections(slotId)}
              >
                Edit corrections
              </Button>
            )
            : (
              <AnswerHoverActions
                slotId={slotId}
                correct={entry.correct}
                markCorrect={markCorrect}
                markWrong={markWrong}
                persistentCorrect={false}
              />
            )}
        </div>
      </div>

      {unreviewed
        ? (
          <SentenceCorrector
            text={entry.value}
            reasoning={entry.reasoning}
            onSave={r => saveCorrection(slotId, r)}
          />
        )
        : (
          <>
            <p className="text-xl font-semibold">
              {corrected ?? entry.value ?? ""}
              {!corrected && !entry.value.trim()
                ? (
                  <span
                    className="
                      text-base font-normal text-muted-foreground italic
                    "
                  >No answer
                  </span>
                )
                : null}
            </p>

            <AnswerEntryCorrections entry={entry} />

            {corrected
              ? (
                <div className="space-y-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOriginal(v => !v)}
                  >
                    {showOriginal
                      ? <EyeOff className="size-4" />
                      : <Eye className="size-4" />}
                    {showOriginal ? "Hide original" : "Show your original"}
                  </Button>
                  {showOriginal
                    ? (
                      <div
                        className="space-y-1 rounded-md border bg-muted/30 p-3"
                      >
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
          </>
        )}
    </div>
  );
}

import type { SentenceCorrectionResult } from "@/components/SentenceCorrector";
import type { WritingCorrection } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";

import { SentenceCorrector } from "@/components/SentenceCorrector";
import { Button } from "@/components/ui/button";
import { CorrectionDiff } from "@/lib/sentenceDiff";

/**
 * One already-corrected sentence in writing-correction mode: the corrected text leads, the original
 * hides behind a diff toggle, and "Edit corrections" reopens the inline corrector in place.
 */
export function WritingCorrectedSegment({
  segment,
  correction,
  language,
  editing,
  showOriginal,
  onStartEdit,
  onToggleOriginal,
  onSaveEdit,
}: {
  segment: string;
  correction: WritingCorrection;
  language: string;
  editing: boolean;
  showOriginal: boolean;
  onStartEdit: () => void;
  onToggleOriginal: () => void;
  onSaveEdit: (result: SentenceCorrectionResult) => void;
}) {
  return (
    <div className="space-y-2">
      <div
        className="flex flex-wrap items-center justify-between gap-2"
      >
        {editing
          ? <span className="text-lg font-semibold">Edit your correction</span>
          : <p className="text-lg">{correction.corrected || segment}</p>}
        <div className="flex shrink-0 items-center gap-1">
          <Link
            to="/my-sentences"
            className="
              inline-flex items-center gap-1 text-sm text-primary
              hover:underline
            "
          >
            <CheckCircle2 className="size-4" />
            In My Sentences
          </Link>
          {editing
            ? null
            : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onStartEdit}
              >
                Edit corrections
              </Button>
            )}
        </div>
      </div>

      {editing
        ? (
          <SentenceCorrector
            text={correction.corrected || segment}
            reasoning={correction.note}
            onSave={onSaveEdit}
          />
        )
        : (
          <>
            {correction.note
              ? <p className="text-sm text-muted-foreground">{correction.note}</p>
              : null}
            <div className="space-y-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onToggleOriginal}
              >
                {showOriginal
                  ? <EyeOff className="size-4" />
                  : <Eye className="size-4" />}
                {showOriginal ? "Hide original" : "Show your original"}
              </Button>
              {showOriginal
                ? (
                  <div
                    className="space-y-1 rounded-md border bg-muted/30 p-2"
                  >
                    <CorrectionDiff
                      written={correction.original}
                      correct={correction.corrected}
                      language={language}
                    />
                  </div>
                )
                : null}
            </div>
          </>
        )}
    </div>
  );
}

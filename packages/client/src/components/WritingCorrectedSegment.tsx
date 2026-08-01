import type { SentenceCorrectionResult } from "@/components/SentenceCorrector";
import type { WritingCorrection } from "@sentence-bank/types";

import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { CheckCircle2, Lock, Pencil } from "lucide-react";

import { ExplainedSentence } from "@/components/ExplainedSentence";
import { ExplanationBody } from "@/components/ExplanationBody";
import { SentenceCorrector } from "@/components/SentenceCorrector";
import { ShowOriginalToggle } from "@/components/ShowOriginalToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WritingCorrectionMeaning } from "@/components/WritingCorrectionMeaning";
import { CorrectionDiff } from "@/lib/sentenceDiff";
import { correctedText, isUnchanged } from "@/lib/writing-corrections";

/**
 * One already-corrected sentence in writing-correction mode. It's shown **read-only** so it's clear
 * it's done and can't be re-corrected by accident: the corrected sentence leads (with any phrases
 * its explanation refers to underlined), the explanation follows, and the original→corrected diff
 * hides behind an opt-in toggle — the same shape as My Sentences and Answer Sheets, and the same
 * reason, which is to keep incorrect text from being the thing you read. A sentence that needed no
 * change has no diff at all. "Revise" (behind a confirm) re-opens the corrector, seeded with the
 * saved correction, so you're editing it rather than starting over.
 */
export function WritingCorrectedSegment({
  correction,
  language,
  editing,
  onStartEdit,
  onSaveEdit,
}: {
  correction: WritingCorrection;
  language: string;
  editing: boolean;
  onStartEdit: () => void;
  onSaveEdit: (result: SentenceCorrectionResult) => void;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const sentence = correctedText(correction);
  const unchanged = isUnchanged(correction);

  if (editing) {
    return (
      <div className="space-y-2">
        <span className="text-sm font-semibold">Revise your correction</span>
        <SentenceCorrector
          text={sentence}
          marks={correction.marks}
          reasoning={correction.note}
          onSave={onSaveEdit}
          saveLabel="Save correction"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge
          variant="outline"
          className="gap-1 text-muted-foreground"
        >
          {unchanged
            ? <CheckCircle2 className="size-3" />
            : (
              <Lock
                className="size-3"
              />
            )}
          {unchanged ? "No changes needed" : "Corrected"}
        </Badge>
        <div className="flex shrink-0 items-center gap-1">
          {correction.mySentenceId
            ? (
              <Link
                to="/my-sentences/$id"
                params={{
                  id: correction.mySentenceId,
                }}
                className="
                  inline-flex items-center gap-1 text-sm text-primary
                  hover:underline
                "
              >
                <CheckCircle2 className="size-4" />
                In My Sentences
              </Link>
            )
            : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              // Guard against accidental overwrite — revising is deliberate.
              if (globalThis.confirm("Revise this correction? It's already saved to My Sentences.")) {
                onStartEdit();
              }
            }}
          >
            <Pencil className="size-4" />
            Revise
          </Button>
        </div>
      </div>

      <ExplainedSentence
        text={sentence}
        explanation={correction.note}
        className="text-lg font-semibold"
      />

      {correction.note
        ? (
          <ExplanationBody
            explanation={correction.note}
            target={sentence}
            className="text-muted-foreground"
          />
        )
        : null}

      {/* Nothing to diff when the sentence was already right. */}
      {unchanged
        ? null
        : (
          <div className="space-y-1">
            <ShowOriginalToggle
              open={showOriginal}
              onToggle={() => setShowOriginal(v => !v)}
            />
            {showOriginal
              ? (
                <div className="rounded-md border bg-muted/30 p-2">
                  <CorrectionDiff
                    written={correction.original}
                    correct={sentence}
                    language={language}
                  />
                </div>
              )
              : null}
          </div>
        )}

      {/* Edit the per-sentence meaning inline — no need to open the My Sentences page. */}
      {correction.mySentenceId
        ? <WritingCorrectionMeaning mySentenceId={correction.mySentenceId} />
        : null}
    </div>
  );
}

import type { SentenceCorrectionResult } from "@/components/SentenceCorrector";
import type { WritingCorrection } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { CheckCircle2, Lock, Pencil } from "lucide-react";

import { SentenceCorrector } from "@/components/SentenceCorrector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorrectionDiff } from "@/lib/sentenceDiff";

/**
 * One already-corrected sentence in writing-correction mode. It's shown **read-only** — the
 * original→corrected diff plus the explanation, so it's clear it's done and can't be re-corrected by
 * accident. "Revise" (behind a confirm) re-opens the corrector, seeded with the saved correction (its
 * corrected text and correct-spans) so you're editing the existing correction, not starting over.
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
  if (editing) {
    return (
      <div className="space-y-2">
        <span className="text-sm font-semibold">Revise your correction</span>
        <SentenceCorrector
          text={correction.corrected || correction.original}
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
          <Lock className="size-3" />
          Corrected
        </Badge>
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

      {/* Read-only: the original → corrected diff, always visible. */}
      <div className="rounded-md border bg-muted/30 p-2">
        <CorrectionDiff
          written={correction.original}
          correct={correction.corrected || correction.original}
          language={language}
        />
      </div>
      {correction.note
        ? <p className="text-sm text-muted-foreground">{correction.note}</p>
        : null}
    </div>
  );
}

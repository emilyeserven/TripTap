import type { MySentence } from "@sentence-bank/types";

import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, NotebookPen, PenLine, TriangleAlert } from "lucide-react";

import { CorrectionDiff } from "../lib/sentenceDiff";
import { groupTermsByCategory, TERM_CATEGORIES } from "../lib/terms";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useDrillReasonCategories } from "@/hooks/useDrillReasonCategories";
import { resolveReasonRef } from "@/lib/drill-reasons";

/** Read-only detail of one My Sentence. When corrected, the corrected version leads and the learner's
 * original (bad Japanese) is hidden behind an opt-in toggle, to reduce exposure to incorrect text. */
export function MySentenceView({
  mySentence: ms,
}: {
  mySentence: MySentence;
}) {
  const termGroups = groupTermsByCategory(ms.terms ?? []);
  const categoriesQuery = useDrillReasonCategories();
  const categories = categoriesQuery.data ?? [];
  const corrected = ms.correction?.trim() ? ms.correction : null;
  const [showOriginal, setShowOriginal] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-xl font-semibold">{corrected ?? ms.text}</p>

      <div
        className="
          flex flex-wrap items-center gap-2 text-xs text-muted-foreground
        "
      >
        <Badge variant="secondary">{ms.language}</Badge>
        {!corrected && ms.needsCorrection
          ? (
            <Badge
              variant="outline"
              className="gap-1 border-destructive/40 text-destructive"
            >
              <TriangleAlert className="size-3" />
              Needs correction
            </Badge>
          )
          : <Badge variant="outline">Corrected</Badge>}
        {ms.practiceSentenceId
          ? (
            <Link
              to="/practice/$id"
              params={{
                id: ms.practiceSentenceId,
              }}
              className="
                inline-flex items-center gap-1
                hover:text-foreground
              "
            >
              <NotebookPen className="size-3" />
              From practice
            </Link>
          )
          : null}
        {ms.writingId
          ? (
            <Link
              to="/my-writing/$id"
              params={{
                id: ms.writingId,
              }}
              className="
                inline-flex items-center gap-1
                hover:text-foreground
              "
            >
              <PenLine className="size-3" />
              From writing
            </Link>
          )
          : null}
        {TERM_CATEGORIES.map(({
          category, label,
        }) => {
          const terms = termGroups[category];
          if (terms.length === 0) return null;
          return (
            <span
              key={category}
              className="inline-flex flex-wrap items-center gap-1"
            >
              <span>{label}:</span>
              {terms.map(term => (
                <Badge
                  key={`${term.sourceId}:${term.id}`}
                  variant="outline"
                  title={term.sourceLabel ? `${term.sourceLabel} (${term.kind})` : undefined}
                >
                  {term.name}
                </Badge>
              ))}
            </span>
          );
        })}
      </div>

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
                : (
                  <Eye
                    className="size-4"
                  />
                )}
              {showOriginal ? "Hide original" : "Show your original"}
            </Button>
            {showOriginal
              ? (
                <div className="space-y-1 rounded-md border bg-muted/30 p-3">
                  <Label className="text-sm">Your original (with corrections)</Label>
                  <CorrectionDiff
                    written={ms.text}
                    correct={corrected}
                    language={ms.language}
                  />
                </div>
              )
              : null}
          </div>
        )
        : null}

      {ms.explanation
        ? (
          <div className="space-y-1">
            <Label className="text-sm">Explanation</Label>
            <p className="text-sm">{ms.explanation}</p>
          </div>
        )
        : null}

      {ms.reasons && ms.reasons.length > 0
        ? (
          <div className="space-y-1">
            <Label className="text-sm">Reasons</Label>
            <div className="flex flex-wrap gap-1.5">
              {ms.reasons.map((ref, i) => (
                <Badge
                  key={ref.reasonId ?? `${ref.categoryId}-${i}`}
                  variant="outline"
                >
                  {resolveReasonRef(categories, ref).label}
                </Badge>
              ))}
            </div>
          </div>
        )
        : null}

      <div
        className="
          grid gap-4
          sm:grid-cols-2
        "
      >
        {ms.translation
          ? (
            <div className="space-y-1">
              <Label className="text-sm">Intended meaning</Label>
              <p className="text-sm text-muted-foreground">{ms.translation}</p>
            </div>
          )
          : null}
        {ms.actualMeaning
          ? (
            <div className="space-y-1">
              <Label className="text-sm">What it actually says</Label>
              <p className="text-sm text-muted-foreground">{ms.actualMeaning}</p>
            </div>
          )
          : null}
      </div>
    </div>
  );
}

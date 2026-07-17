import type { MySentence } from "@sentence-bank/types";

import { useState } from "react";

import { Eye, EyeOff } from "lucide-react";

import { CorrectionDiff } from "../lib/sentenceDiff";

import { MySentenceMetaBadges } from "@/components/MySentenceMetaBadges";
import { SentenceCorrector } from "@/components/SentenceCorrector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useDrillReasonCategories } from "@/hooks/useDrillReasonCategories";
import { useUpdateMySentence } from "@/hooks/useMySentences";
import { resolveReasonRef } from "@/lib/drill-reasons";

/** Read-only detail of one My Sentence. When corrected, the corrected version leads and the learner's
 * original (bad Japanese) is hidden behind an opt-in toggle, to reduce exposure to incorrect text. */
export function MySentenceView({
  mySentence: ms,
}: {
  mySentence: MySentence;
}) {
  const categoriesQuery = useDrillReasonCategories();
  const categories = categoriesQuery.data ?? [];
  const corrected = ms.correction?.trim() ? ms.correction : null;
  const update = useUpdateMySentence();
  // Un-reviewed = still flagged and not yet corrected → offer the inline corrector.
  const unreviewed = !corrected && ms.needsCorrection;
  const [showOriginal, setShowOriginal] = useState(false);

  return (
    <div className="space-y-4">
      {unreviewed
        ? (
          <SentenceCorrector
            text={ms.text}
            reasoning={ms.explanation}
            onSave={r => update.mutate({
              id: ms.id,
              input: {
                correction: r.correction,
                marks: r.marks,
                explanation: r.reasoning,
              },
            })}
          />
        )
        : <p className="text-2xl font-semibold">{corrected ?? ms.text}</p>}

      <MySentenceMetaBadges mySentence={ms} />

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

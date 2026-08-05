import type { MySentence } from "@sentence-bank/types";

import { useState } from "react";

import { CorrectionDiff } from "../lib/sentenceDiff";

import { ExplainedSentence } from "@/components/ExplainedSentence";
import { ExplanationBody } from "@/components/ExplanationBody";
import { MySentenceMetaBadges } from "@/components/MySentenceMetaBadges";
import { SentenceCorrector } from "@/components/SentenceCorrector";
import { ShowOriginalToggle } from "@/components/ShowOriginalToggle";
import { Badge } from "@/components/ui/badge";
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
  // Hovering a note below highlights the phrase it refers to in the sentence above.
  const [hoveredSnippet, setHoveredSnippet] = useState<string | null>(null);
  // What the explanation's `phrase: note` references resolve against — the fix if there is one,
  // otherwise what the learner wrote, so an already-correct sentence can still be annotated.
  const explained = corrected ?? ms.text;

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
        : (
          <ExplainedSentence
            text={explained}
            explanation={ms.explanation}
            // The stored reading was generated from `text`, so it only aligns when that's what's shown.
            reading={corrected ? null : ms.reading}
            className="text-2xl font-semibold"
            highlightSnippet={hoveredSnippet}
          />
        )}

      <MySentenceMetaBadges mySentence={ms} />

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
            <ExplanationBody
              explanation={ms.explanation}
              target={explained}
              onHoverSnippet={setHoveredSnippet}
            />
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

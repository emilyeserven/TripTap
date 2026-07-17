import type { MySentence } from "@sentence-bank/types";

import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { Check, Eye, EyeOff } from "lucide-react";

import { CorrectionDiff } from "../lib/sentenceDiff";

import { MySentenceMetaBadges } from "@/components/MySentenceMetaBadges";
import { SentenceCorrector } from "@/components/SentenceCorrector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUpdateMySentence } from "@/hooks/useMySentences";

/**
 * One learner-produced sentence in the list — the same correction flow as Answer Sheet entries. When it
 * still needs correction it offers the inline track-changes {@link SentenceCorrector} (plus a ✓ to mark
 * it as actually fine); once corrected it leads with the fix, hiding the original behind a toggle. Where
 * inline editing is enabled (`onEdit`, e.g. within a lesson) it also exposes "Edit corrections" to revise
 * the fix in place, seeded from the current correction. `readOnly` collapses it to a plain read-only summary.
 */
export function MySentenceCard({
  mySentence: ms,
  onEdit,
  readOnly = false,
}: {
  mySentence: MySentence;
  /** When provided, "Edit" becomes an in-page button (this callback) instead of a link to the edit
   * route — used where the sentence is edited inline, e.g. within a lesson. */
  onEdit?: (id: string) => void;
  /** Pure read-only summary — no inline corrector, ✓, or "Edit corrections". */
  readOnly?: boolean;
}) {
  const corrected = ms.correction?.trim() ? ms.correction : null;
  const [showOriginal, setShowOriginal] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const update = useUpdateMySentence();

  // Un-reviewed = still flagged and not yet corrected → offer the inline corrector (unless read-only).
  const unreviewed = !corrected && ms.needsCorrection;
  const showCorrector = !readOnly && (unreviewed || correcting);

  function saveCorrection(r: { correction: string;
    marks: MySentence["marks"];
    reasoning: string | null; }) {
    update.mutate(
      {
        id: ms.id,
        input: {
          correction: r.correction,
          marks: r.marks,
          explanation: r.reasoning,
        },
      },
      {
        onSuccess: () => setCorrecting(false),
      },
    );
  }

  function markCorrect() {
    update.mutate({
      id: ms.id,
      input: {
        needsCorrection: false,
      },
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="group flex items-start justify-between gap-2">
          {showCorrector
            ? <span className="text-lg font-semibold">Correct your sentence</span>
            : (
              <Link
                to="/my-sentences/$id"
                params={{
                  id: ms.id,
                }}
                className="
                  text-lg font-semibold
                  hover:underline
                "
              >
                {corrected ?? ms.text}
              </Link>
            )}
          <div className="flex shrink-0 items-center gap-1">
            {!readOnly && unreviewed && !correcting
              ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Mark correct — no correction needed"
                  className="
                    size-8 text-green-600 opacity-0 transition-opacity
                    group-hover:opacity-100
                  "
                  onClick={markCorrect}
                >
                  <Check className="size-4" />
                </Button>
              )
              : null}
            {onEdit && corrected && !correcting
              ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCorrecting(true)}
                >
                  Edit corrections
                </Button>
              )
              : null}
            {onEdit
              ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(ms.id)}
                >
                  Edit
                </Button>
              )
              : (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                >
                  <Link
                    to="/my-sentences/$id/edit"
                    params={{
                      id: ms.id,
                    }}
                  >
                    Edit
                  </Link>
                </Button>
              )}
          </div>
        </div>

        {showCorrector
          ? (
            <SentenceCorrector
              // Re-editing an already-corrected sentence revises the correction; a first-time review
              // starts from the learner's original.
              text={correcting && corrected ? corrected : ms.text}
              reasoning={ms.explanation}
              onSave={saveCorrection}
            />
          )
          : null}

        {!showCorrector && corrected
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
                  <div className="space-y-1 rounded-md border bg-muted/30 p-2">
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

        {ms.translation ? <p className="text-sm text-muted-foreground">Meant: {ms.translation}</p> : null}

        <MySentenceMetaBadges mySentence={ms} />
      </CardContent>
    </Card>
  );
}

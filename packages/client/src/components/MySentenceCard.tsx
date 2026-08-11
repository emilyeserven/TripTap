import type { Sentence } from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { Link } from "@tanstack/react-router";
import { Check, Headphones, ScrollText } from "lucide-react";
import { toast } from "sonner";

import { CorrectionDiff } from "../lib/sentenceDiff";

import { AddToShadowingListButton } from "@/components/AddToShadowingListButton";
import { ExplainedSentence } from "@/components/ExplainedSentence";
import { ExplanationBody } from "@/components/ExplanationBody";
import { MySentenceGrammarTags } from "@/components/MySentenceGrammarTags";
import { MySentenceMetaBadges } from "@/components/MySentenceMetaBadges";
import { SentenceCorrector } from "@/components/SentenceCorrector";
import { ShowOriginalToggle } from "@/components/ShowOriginalToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateSentence, useSentences, useUpdateSentence } from "@/hooks/useSentences";
import { explainSentence } from "@/lib/explanationRefs";

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
  mySentence: Sentence;
  /** When provided, "Edit" becomes an in-page button (this callback) instead of a link to the edit
   * route — used where the sentence is edited inline, e.g. within a lesson. */
  onEdit?: (id: string) => void;
  /** Pure read-only summary — no inline corrector, ✓, or "Edit corrections". */
  readOnly?: boolean;
}) {
  const corrected = ms.correction?.trim() ? ms.correction : null;
  const [showOriginal, setShowOriginal] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const update = useUpdateSentence();

  // Un-reviewed = still flagged and not yet corrected → offer the inline corrector (unless read-only).
  const unreviewed = !corrected && ms.needsCorrection;
  const showCorrector = !readOnly && (unreviewed || correcting);
  // What the explanation's `phrase: note` references resolve against — the fix if there is one,
  // otherwise what the learner wrote, so an already-correct sentence can still be annotated.
  const explained = corrected ?? ms.text;
  const {
    hasRefs,
  } = explainSentence(explained, ms.explanation);

  function saveCorrection(r: { correction: string;
    marks: Sentence["marks"];
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

  function toggleShadowing() {
    update.mutate({
      id: ms.id,
      input: {
        shadowingCandidate: !ms.shadowingCandidate,
      },
    });
  }

  const {
    data: bankSentences,
  } = useSentences({
    kind: "bank",
  });
  const createSentence = useCreateSentence();
  const [promoted, setPromoted] = useState(false);
  // Already in the bank (by exact text) → the promote button disappears; the bank query is cached
  // app-wide, so this check is free. Covers both prior promotions and post-promote refetches.
  const alreadyBanked = useMemo(() => {
    const target = (corrected ?? ms.text).trim();
    return (bankSentences ?? []).some(s => s.text.trim() === target);
  }, [bankSentences, corrected, ms.text]);

  function promoteToBank() {
    createSentence.mutate(
      {
        kind: "bank",
        // Only the corrected form is bank-worthy; the button is gated on `corrected` below.
        text: corrected ?? ms.text,
        translation: ms.translation,
        language: ms.language,
        terms: ms.terms,
        notes: "Promoted from My Sentences",
        // Lineage: the new bank row points back at the sentence it was promoted from.
        derivedFromId: ms.id,
      },
      {
        onSuccess: () => {
          setPromoted(true);
          toast.success("Added to the sentence bank");
        },
        onError: err => toast.error("Couldn't add to the sentence bank", {
          description: err instanceof Error ? err.message : undefined,
        }),
      },
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="group flex items-start justify-between gap-2">
          {showCorrector
            ? <span className="text-lg font-semibold">Correct your sentence</span>
            : hasRefs
              // A link can't hold the hover targets: its own underline paints through them, and a
              // focusable span inside an anchor breaks both tab order and clicking a phrase. The
              // "Open" action below stands in for the headline link in this case.
              ? (
                <ExplainedSentence
                  text={explained}
                  explanation={ms.explanation}
                  // Generated from `text`, so it only aligns when the correction isn't being shown.
                  reading={corrected ? null : ms.reading}
                  className="text-lg font-semibold"
                />
              )
              : (
                <Link
                  to="/sentences/$id"
                  params={{
                    id: ms.id,
                  }}
                  className="
                    text-lg font-semibold
                    hover:underline
                  "
                >
                  {explained}
                </Link>
              )}
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={ms.shadowingCandidate
                ? "Remove from shadowing candidates"
                : "Mark as a shadowing candidate"}
              aria-pressed={ms.shadowingCandidate}
              title="Shadowing candidate"
              className={`
                size-8 transition-opacity
                ${ms.shadowingCandidate
      ? "text-primary"
      : `
        text-muted-foreground opacity-0
        group-hover:opacity-100
      `}
              `}
              onClick={toggleShadowing}
            >
              <Headphones className="size-4" />
            </Button>
            {ms.shadowingCandidate
              ? (
                <AddToShadowingListButton
                  id={ms.id}
                />
              )
              : null}
            {!readOnly && corrected && !alreadyBanked
              ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Promote the corrected sentence to the bank"
                  title="Promote to bank"
                  disabled={promoted || createSentence.isPending}
                  className="
                    size-8 text-muted-foreground opacity-0 transition-opacity
                    group-hover:opacity-100
                  "
                  onClick={promoteToBank}
                >
                  <ScrollText className="size-4" />
                </Button>
              )
              : null}
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
            {/* The headline stopped being a link to make room for the hover targets. */}
            {hasRefs && !showCorrector && !onEdit
              ? (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                >
                  <Link
                    to="/sentences/$id"
                    params={{
                      id: ms.id,
                    }}
                  >
                    Open
                  </Link>
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
                    to="/sentences/$id/edit"
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
              <ShowOriginalToggle
                open={showOriginal}
                onToggle={() => setShowOriginal(v => !v)}
              />
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

        {/* The correction note — why it was wrong. Shown whenever we're not actively correcting (the
            corrector already exposes it as an editable field), so it's visible in read-only/view mode. */}
        {!showCorrector && ms.explanation?.trim()
          ? (
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">Explanation</p>
              <ExplanationBody
                explanation={ms.explanation}
                target={explained}
              />
            </div>
          )
          : null}

        {ms.translation ? <p className="text-sm text-muted-foreground">Meant: {ms.translation}</p> : null}

        <MySentenceMetaBadges
          mySentence={ms}
          omitCategories={readOnly ? undefined : ["grammar"]}
        />

        {/* Grammar tagging happens in bulk from this list, so it's editable in place rather than
            only on the sentence's own page. */}
        {readOnly ? null : <MySentenceGrammarTags mySentence={ms} />}
      </CardContent>
    </Card>
  );
}

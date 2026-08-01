import type { SentenceCorrectionResult } from "@/components/SentenceCorrector";

import { Check, PlusIcon } from "lucide-react";

import { SentenceCorrector } from "@/components/SentenceCorrector";
import { Button } from "@/components/ui/button";

/**
 * One not-yet-corrected sentence in writing-correction mode: a "Correct" button that opens the
 * inline corrector, plus a ✓ for a sentence that was simply right — most sentences in a decent
 * writing need no fix, and making that a single click is what keeps the pass moving. (The corrector
 * also offers "No changes needed" for when the sentence is fine but still deserves a note.)
 * Either way the sentence is added to My Sentences via the parent.
 */
export function WritingUncorrectedSegment({
  segment,
  adding,
  onStartAdd,
  onSave,
  onMarkCorrect,
}: {
  segment: string;
  adding: boolean;
  onStartAdd: () => void;
  onSave: (result: SentenceCorrectionResult) => void;
  onMarkCorrect: () => void;
}) {
  return (
    <div className="space-y-2">
      <div
        className="flex flex-wrap items-center justify-between gap-2"
      >
        {adding
          ? <span className="text-lg font-semibold">Correct your sentence</span>
          : <p className="text-lg">{segment}</p>}
        {adding
          ? null
          : (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onStartAdd}
              >
                <PlusIcon className="size-4" />
                Correct
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Mark correct — no changes needed"
                title="Mark correct — no changes needed"
                className="size-8 text-green-600"
                onClick={onMarkCorrect}
              >
                <Check className="size-4" />
              </Button>
            </div>
          )}
      </div>

      {adding
        ? (
          <SentenceCorrector
            text={segment}
            onSave={onSave}
            saveLabel="Add to My Sentences"
          />
        )
        : null}
    </div>
  );
}

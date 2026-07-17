import type { SentenceCorrectionResult } from "@/components/SentenceCorrector";

import { PlusIcon } from "lucide-react";

import { SentenceCorrector } from "@/components/SentenceCorrector";
import { Button } from "@/components/ui/button";

/**
 * One not-yet-corrected sentence in writing-correction mode: a "Correct" button that opens the
 * inline corrector; saving adds the sentence to My Sentences via the parent.
 */
export function WritingUncorrectedSegment({
  segment,
  adding,
  onStartAdd,
  onSave,
}: {
  segment: string;
  adding: boolean;
  onStartAdd: () => void;
  onSave: (result: SentenceCorrectionResult) => void;
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
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onStartAdd}
            >
              <PlusIcon className="size-4" />
              Correct
            </Button>
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

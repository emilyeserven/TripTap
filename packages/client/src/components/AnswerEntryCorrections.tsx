import type { AnswerSheetEntry } from "@sentence-bank/types";

import { ExplanationBody } from "@/components/ExplanationBody";
import { Label } from "@/components/ui/label";

/** The supporting correction fields for one entry (explanation + meanings), each shown only when
 * present. The corrected answer itself leads the block, so it is not repeated here. */
export function AnswerEntryCorrections({
  entry,
}: {
  entry: AnswerSheetEntry;
}) {
  return (
    <>
      {entry.reasoning
        ? (
          <div className="space-y-1">
            <Label className="text-sm">Explanation</Label>
            {/* Same target string as the headline in `AnswerEntry`, so a phrase underlines in both. */}
            <ExplanationBody
              explanation={entry.reasoning}
              target={entry.correction?.trim() || entry.value}
              className="text-muted-foreground"
            />
          </div>
        )
        : null}
      {entry.intendedMeaning || entry.actualMeaning
        ? (
          <div
            className="
              grid gap-4
              sm:grid-cols-2
            "
          >
            {entry.intendedMeaning
              ? (
                <div className="space-y-1">
                  <Label className="text-sm">Intended meaning</Label>
                  <p className="text-sm text-muted-foreground">{entry.intendedMeaning}</p>
                </div>
              )
              : null}
            {entry.actualMeaning
              ? (
                <div className="space-y-1">
                  <Label className="text-sm">What it actually says</Label>
                  <p className="text-sm text-muted-foreground">{entry.actualMeaning}</p>
                </div>
              )
              : null}
          </div>
        )
        : null}
    </>
  );
}

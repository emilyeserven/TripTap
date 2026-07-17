import type { AnswerSheetEntry } from "@sentence-bank/types";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** The modal opened by ✗: edit the correction fields for one slot; changes persist on close. */
export function AnswerCorrectionModal({
  slotId,
  label,
  entry,
  setField,
  onClose,
}: {
  slotId: string | null;
  label: string;
  entry: AnswerSheetEntry | null;
  setField: <K extends keyof AnswerSheetEntry>(
    slotId: string,
    field: K,
    value: AnswerSheetEntry[K],
  ) => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={slotId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Correction</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>

        {slotId && entry
          ? (
            <div className="space-y-4">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Your answer</p>
                <p className="text-lg font-semibold">
                  {entry.value.trim() || (
                    <span
                      className="
                        text-base font-normal text-muted-foreground italic
                      "
                    >
                      No answer
                    </span>
                  )}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="corr-modal">Correction</Label>
                <Textarea
                  id="corr-modal"
                  value={entry.correction ?? ""}
                  onChange={e => setField(slotId, "correction", e.target.value)}
                  placeholder="The corrected answer"
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reason-modal">Explanation (Markdown)</Label>
                <Textarea
                  id="reason-modal"
                  value={entry.reasoning ?? ""}
                  onChange={e => setField(slotId, "reasoning", e.target.value)}
                  placeholder="Why it was wrong — Markdown & multiple lines supported"
                  rows={4}
                />
              </div>
              <div
                className="
                  grid gap-4
                  sm:grid-cols-2
                "
              >
                <div className="space-y-1.5">
                  <Label htmlFor="intended-modal">Intended meaning</Label>
                  <Textarea
                    id="intended-modal"
                    value={entry.intendedMeaning ?? ""}
                    onChange={e => setField(slotId, "intendedMeaning", e.target.value)}
                    placeholder="What you meant to say"
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="actual-modal">What it actually says</Label>
                  <Textarea
                    id="actual-modal"
                    value={entry.actualMeaning ?? ""}
                    onChange={e => setField(slotId, "actualMeaning", e.target.value)}
                    placeholder="The literal reading of your answer, if different"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )
          : null}

        <DialogFooter>
          <Button
            type="button"
            onClick={onClose}
          >
            Save correction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

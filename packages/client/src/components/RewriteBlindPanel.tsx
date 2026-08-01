import type { Writing } from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { LightbulbIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useCreateWriting } from "@/hooks/useWritings";
import { todayDateString } from "@/lib/daily-lineup";
import { diffChars } from "@/lib/simple-diff";
import { correctedText } from "@/lib/writing-corrections";

/** The "corrected version" of a past writing: its corrected sentences, else the original text. */
function correctedVersion(writing: Writing): string {
  const corrections = writing.corrections ?? [];
  // `correctedText` covers the "no change needed" entries, whose `corrected` is empty.
  if (corrections.length > 0) return corrections.map(correctedText).join("\n");
  return writing.text;
}

/**
 * Rewrite-blind (spec §8): re-present a past writing's prompt with the text hidden, take a fresh
 * attempt, then diff it against the corrected version. What breaks a second time is the real gap. The
 * fresh attempt can be saved as a new writing (same prompt) to keep the loop going.
 */
export function RewriteBlindPanel({
  writing,
}: { writing: Writing }) {
  const createWriting = useCreateWriting();
  const [attempt, setAttempt] = useState("");
  const [revealed, setRevealed] = useState(false);

  const target = correctedVersion(writing);
  const diff = useMemo(
    () => (revealed ? diffChars(attempt, target) : []),
    [revealed, attempt, target],
  );

  function saveAsNew() {
    createWriting.mutate(
      {
        text: attempt,
        language: writing.language,
        date: todayDateString(new Date()),
        readyToReview: false,
        promptTitle: writing.promptTitle,
        promptText: writing.promptText,
      },
      {
        onSuccess: () => toast.success("Saved your fresh attempt as a new writing"),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rewrite blind</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {writing.promptText
          ? (
            <div className="rounded-md border border-dashed bg-muted/40 p-3">
              <p
                className="
                  flex items-center gap-1.5 text-xs font-medium
                  text-muted-foreground
                "
              >
                <LightbulbIcon className="size-3.5" />
                Prompt
                {writing.promptTitle ? `: ${writing.promptTitle}` : null}
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{writing.promptText}</p>
            </div>
          )
          : (
            <p className="text-sm text-muted-foreground">
              No saved prompt — write again from memory on the same topic.
            </p>
          )}

        <div className="space-y-1.5">
          <p className="text-sm font-medium">Fresh attempt (don’t peek)</p>
          <Textarea
            value={attempt}
            onChange={e => setAttempt(e.target.value)}
            placeholder="Write it again from scratch…"
            rows={4}
            className="text-lg"
          />
        </div>

        {revealed
          ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Diff vs your corrected version</p>
                <p className="rounded-md border p-3 text-lg/relaxed">
                  {diff.map((seg, i) => (
                    <span
                      key={i}
                      className={
                        seg.type === "added"
                          ? `
                            rounded-sm bg-emerald-500/20 text-emerald-700
                            dark:text-emerald-300
                          `
                          : seg.type === "removed"
                            ? `
                              rounded-sm bg-destructive/20 text-destructive
                              line-through
                            `
                            : ""
                      }
                    >
                      {seg.value}
                    </span>
                  ))}
                </p>
                <p className="text-xs text-muted-foreground">
                  Green = in your corrected version but not your attempt; struck = only in your attempt.
                  What broke again is the real gap.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={saveAsNew}
                disabled={!attempt.trim() || createWriting.isPending}
              >
                Save as a new writing
              </Button>
            </div>
          )
          : (
            <Button
              onClick={() => setRevealed(true)}
              disabled={!attempt.trim()}
            >
              Reveal &amp; compare
            </Button>
          )}
      </CardContent>
    </Card>
  );
}

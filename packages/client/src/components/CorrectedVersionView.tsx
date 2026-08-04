import type { Writing, WritingCorrection } from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { Eye, EyeOff } from "lucide-react";

import { ExplanationBody } from "@/components/ExplanationBody";
import { ShowOriginalToggle } from "@/components/ShowOriginalToggle";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CorrectionDiff } from "@/lib/sentenceDiff";
import { cn } from "@/lib/utils";
import { correctedText, isUnchanged, splitLines } from "@/lib/writing-corrections";

/**
 * The read-only "Corrected version" of a writing, rendered one line at a time so each line can carry
 * its own detail. A single block-level toggle swaps the clean corrected text for a diff of what
 * changed (additions in green, removals struck through); each line that has an explanation exposes an
 * eye at its far right — hidden until the row is hovered — that reveals the note beneath it.
 *
 * Lines are paired to their {@link WritingCorrection} exactly how the correction flow matches them
 * (trimmed equality on `original`, same as `fullyCorrectedText`), so a line edited since it was
 * corrected simply falls back to its current text.
 */
export function CorrectedVersionView({
  writing,
}: { writing: Writing }) {
  const [showChanges, setShowChanges] = useState(false);

  const lines = useMemo(() => {
    const byOriginal = new Map(
      (writing.corrections ?? []).map(c => [c.original.trim(), c] as const),
    );
    return splitLines(writing.text).map(seg => ({
      seg,
      correction: byOriginal.get(seg.trim()) ?? null,
    }));
  }, [writing]);

  const anyChanged = lines.some(l => l.correction && !isUnchanged(l.correction));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm">Corrected version</Label>
        {anyChanged
          ? (
            <ShowOriginalToggle
              open={showChanges}
              onToggle={() => setShowChanges(v => !v)}
              showLabel="Show changes"
              hideLabel="Hide changes"
            />
          )
          : null}
      </div>
      <div
        className="space-y-1 rounded-md border bg-muted/30 p-3"
      >
        {lines.map((l, i) => (
          <CorrectedLine
            key={i}
            seg={l.seg}
            correction={l.correction}
            showChanges={showChanges}
            language={writing.language}
          />
        ))}
      </div>
    </div>
  );
}

function CorrectedLine({
  seg,
  correction,
  showChanges,
  language,
}: {
  seg: string;
  correction: WritingCorrection | null;
  showChanges: boolean;
  language: string;
}) {
  const [open, setOpen] = useState(false);
  const text = correction ? correctedText(correction) : seg;
  const changed = Boolean(correction) && !isUnchanged(correction as WritingCorrection);
  const hasNote = Boolean(correction?.note);

  return (
    <div>
      <div className="group flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 text-lg whitespace-pre-wrap">
          {showChanges && changed && correction
            ? (
              <CorrectionDiff
                written={correction.original}
                correct={text}
                language={language}
                className="text-lg"
              />
            )
            : text}
        </div>
        {hasNote
          ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={cn(
                "size-6 shrink-0 text-muted-foreground transition-opacity",
                open
                  ? "opacity-100"
                  : `
                    opacity-0
                    group-hover:opacity-100
                  `,
              )}
              aria-label={open ? "Hide explanation" : "Show explanation"}
              aria-expanded={open}
              onClick={() => setOpen(o => !o)}
            >
              {open ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          )
          : null}
      </div>
      {open && hasNote
        ? (
          <ExplanationBody
            explanation={correction?.note}
            target={text}
            className="pl-1 text-muted-foreground"
          />
        )
        : null}
    </div>
  );
}

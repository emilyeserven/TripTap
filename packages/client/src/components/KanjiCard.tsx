import type { KanjiStatus, KanjiSummary } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

/** Ring colour per status, so the grid reads as progress at a glance rather than needing labels. */
const STATUS_RING: Record<KanjiStatus, string> = {
  new: "border-border",
  learning: "border-amber-500",
  known: "border-emerald-500",
};

/** Screen-reader wording for the status, which the ring alone doesn't convey. */
const STATUS_LABEL: Record<KanjiStatus, string> = {
  new: "not started",
  learning: "learning",
  known: "known",
};

/**
 * One character in the grid: the kanji itself, how often it appears, and its status as a ring.
 *
 * The character is the whole target — big enough to read at a glance and to tap on a phone.
 */
export function KanjiCard({
  kanji,
}: {
  kanji: KanjiSummary;
}) {
  return (
    <Link
      to="/kanji/$char"
      params={{
        char: kanji.char,
      }}
      aria-label={
        `${kanji.char} — ${kanji.occurrences} `
        + `${kanji.occurrences === 1 ? "occurrence" : "occurrences"}, ${STATUS_LABEL[kanji.status]}`
      }
      className={cn(
        `
          flex flex-col items-center justify-center gap-1 rounded-lg border-2
          p-3 transition-colors
          hover:bg-accent
        `,
        STATUS_RING[kanji.status],
      )}
    >
      <span className="text-3xl leading-none">{kanji.char}</span>
      <span className="text-xs text-muted-foreground">{kanji.occurrences}</span>
    </Link>
  );
}

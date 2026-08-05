import type { Writing, WritingCorrection } from "@sentence-bank/types";

import { splitLines } from "@sentence-bank/types";

/**
 * The text a correction represents: its fix, or the original sentence when it needed no change.
 * An empty `corrected` is the "reviewed, nothing to fix" marker (see the type's docs), so it must
 * never be read bare — doing so yields a blank sentence.
 */
export function correctedText(correction: WritingCorrection): string {
  return correction.corrected.trim() ? correction.corrected : correction.original;
}

/** Whether a correction records "this was already right" rather than an actual fix. */
export function isUnchanged(correction: WritingCorrection): boolean {
  return !correction.corrected.trim()
    || correction.corrected.trim() === correction.original.trim();
}

// The segmenters are shared with the API (which addresses writing lines by position), so they live
// in @sentence-bank/types; re-exported here under the path this module's callers already use.
export { splitLines, splitSentences } from "@sentence-bank/types";

/**
 * The whole writing with each sentence's correction applied, in the order the sentences appear in the
 * text. Uncorrected lines are kept as written; corrected lines use their fix (or the original when the
 * correction was "no change needed"). Corrections are matched to lines exactly how the correction flow
 * does — trimmed equality on `original` (see {@link splitLines}) — so a line edited since it was
 * corrected simply falls back to its current text. Returns the raw text when nothing is corrected.
 */
export function fullyCorrectedText(writing: Pick<Writing, "text" | "corrections">): string {
  const corrections = writing.corrections ?? [];
  if (corrections.length === 0) return writing.text;
  const byOriginal = new Map(corrections.map(c => [c.original.trim(), c] as const));
  return splitLines(writing.text)
    .map((segment) => {
      const correction = byOriginal.get(segment.trim());
      return correction ? correctedText(correction) : segment;
    })
    .join("\n");
}

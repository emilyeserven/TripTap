import type { WritingCorrection } from "@sentence-bank/types";

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

/**
 * Split free-form text into sentence segments. A boundary is any run of terminal punctuation
 * (。！？.!?) or the end of a non-empty line — so an unpunctuated line still counts as one sentence.
 */
export function splitSentences(text: string): string[] {
  const segments: string[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const matches = line.match(/[^。！？.!?]*[。！？.!?]+|[^。！？.!?]+$/g) ?? [line];
    for (const m of matches) {
      const trimmed = m.trim();
      if (trimmed) segments.push(trimmed);
    }
  }
  return segments;
}

/**
 * Split free-form text into segments one per non-empty line — a new sentence is detected only
 * on a new line. Unlike {@link splitSentences}, terminal punctuation (。！？.!?) mid-line and dots
 * inside tokens like "honto.jp" never break a line apart. Used by the My Writing corrections flow.
 */
export function splitLines(text: string): string[] {
  const segments: string[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed) segments.push(trimmed);
  }
  return segments;
}

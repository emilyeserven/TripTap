/**
 * Shared text segmentation for learner writing.
 *
 * Both sides need to agree on where one sentence ends and the next begins: the client splits a
 * writing to offer each segment for correction, and the API splits the same text to offer those
 * segments as triage-import candidates addressed *by position*. A drift between the two
 * implementations would silently re-point every line-indexed reference, so the implementation lives
 * here rather than being maintained twice (as it was — byte-identically — in
 * `client/src/lib/writing-corrections.ts` and `middleware/src/services/correction-import.ts`).
 */

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
 * Split free-form text into segments one per non-empty line — a new sentence is detected only on a
 * new line. Unlike {@link splitSentences}, terminal punctuation mid-line and dots inside tokens like
 * "honto.jp" never break a line apart. Used by the My Writing corrections flow.
 */
export function splitLines(text: string): string[] {
  const segments: string[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed) segments.push(trimmed);
  }
  return segments;
}

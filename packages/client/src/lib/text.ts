/** Small text-measuring helpers shared across the client. */

/**
 * Count the words in a block of text: whitespace-delimited runs, ignoring empty splits. Matches the
 * "N words" a word processor reports for latin text; used by the theory-study word-count paste tool.
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

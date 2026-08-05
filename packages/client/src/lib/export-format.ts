/**
 * Shared formatting rules for the bulk-import exports (Anki, Renshuu). Both targets are line-based
 * and column-separated, so both need the same guarantee: no field may contain a line break or a
 * separator, or one row silently becomes two (or its columns shift).
 */

/**
 * Normalize one exported field: collapse any internal tabs/newlines/runs of whitespace to a single
 * space and trim. A stray line break in a sentence would otherwise split one note across rows.
 */
export function field(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/**
 * True when a row carries both halves of a front/back note — a Japanese line and a translation.
 * Shared by the Anki and Renshuu sentence exports, which have the same requirement.
 */
export function hasSentencePair(row: { text: string;
  translation: string | null; }): boolean {
  return Boolean(row.text.trim() && row.translation && row.translation.trim());
}

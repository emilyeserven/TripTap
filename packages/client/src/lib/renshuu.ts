/** A row eligible for Renshuu export needs both a Japanese line and an English translation. */
export interface RenshuuRow {
  text: string;
  translation: string | null;
}

/** True when a sentence has both columns Renshuu's bulk sentence import needs. */
export function isRenshuuEligible(row: RenshuuRow): boolean {
  return Boolean(row.text.trim() && row.translation && row.translation.trim());
}

/**
 * Format sentences as Renshuu bulk-import lines — one `<japanese>\t<english>` per line. Rows without
 * a translation are skipped (Renshuu needs both columns).
 */
export function toRenshuuText(rows: RenshuuRow[]): string {
  const lines: string[] = [];
  for (const row of rows) {
    const jp = row.text.trim();
    const en = row.translation?.trim();
    if (jp && en) lines.push(`${jp}\t${en}`);
  }
  return lines.join("\n");
}

/** A vocab row for Renshuu word import: the term, plus an optional reading. */
export interface RenshuuVocabRow {
  term: string;
  reading: string | null;
}

/**
 * Format vocab as Renshuu word-import lines — one `term/reading` per line (Renshuu's convention for
 * disambiguating a reading, e.g. `行く/いく`), or just the term when there's no reading. Rows without a
 * term are skipped.
 */
export function toRenshuuVocabText(rows: RenshuuVocabRow[]): string {
  const lines: string[] = [];
  for (const row of rows) {
    const term = row.term.trim();
    if (!term) continue;
    const reading = row.reading?.trim();
    lines.push(reading ? `${term}/${reading}` : term);
  }
  return lines.join("\n");
}

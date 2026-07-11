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

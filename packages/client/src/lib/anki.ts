import type { FuriToken } from "@sentence-bank/types";

/**
 * Anki's default text import is tab-separated, one note per line. Collapse any internal tabs or
 * newlines in a field so a stray line break can't split one note across rows (or shift columns).
 */
function field(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/** Concatenate a furigana segmentation into a plain kana reading (ruby where present, base otherwise). */
export function furiganaReading(tokens: FuriToken[] | null): string {
  if (!tokens) return "";
  return tokens.map(tok => tok.r ?? tok.t).join("");
}

/** A sentence note for Anki import: the expression (front), its meaning (back), and an optional reading. */
export interface AnkiSentenceRow {
  text: string;
  translation: string | null;
  reading?: string | null;
}

/** True when a sentence has both the expression and meaning an Anki front/back note needs. */
export function isAnkiSentenceEligible(row: { text: string;
  translation: string | null; }): boolean {
  return Boolean(row.text.trim() && row.translation && row.translation.trim());
}

/**
 * Format sentences as Anki import lines — `expression⇥meaning⇥reading`, one note per line. Rows
 * missing an expression or a meaning are skipped; the reading column is left empty when unknown.
 */
export function toAnkiSentenceText(rows: AnkiSentenceRow[]): string {
  const lines: string[] = [];
  for (const row of rows) {
    const expression = field(row.text);
    const meaning = field(row.translation);
    if (!expression || !meaning) continue;
    lines.push([expression, meaning, field(row.reading)].join("\t"));
  }
  return lines.join("\n");
}

/** A vocab note for Anki import: the term, its reading, and its meaning. */
export interface AnkiVocabRow {
  term: string;
  reading: string | null;
  meaning: string | null;
}

/**
 * Format vocab as Anki import lines — `term⇥reading⇥meaning`, one note per line. Rows without a term
 * are skipped; the reading and meaning columns are left empty when unknown.
 */
export function toAnkiVocabText(rows: AnkiVocabRow[]): string {
  const lines: string[] = [];
  for (const row of rows) {
    const term = field(row.term);
    if (!term) continue;
    lines.push([term, field(row.reading), field(row.meaning)].join("\t"));
  }
  return lines.join("\n");
}

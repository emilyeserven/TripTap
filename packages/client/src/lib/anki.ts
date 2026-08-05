import type { ChunkCard, ContrastPair, FuriToken } from "@sentence-bank/types";

import { field, hasSentencePair } from "./export-format";

/** Anki's default text import is tab-separated, one note per line. */

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
  return hasSentencePair(row);
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

/**
 * Format rule-group contrast pairs as Anki import lines — one note per {@link ContrastPair}, four
 * columns `frontA⇥answerA⇥frontB⇥answerB`. Import into a note type with two card templates
 * (front A→answer A, front B→answer B): one note → two sibling cards, so Anki buries siblings and
 * they never surface together (spec §6 inv.5). Both discrimination options appear on each front
 * (inv.4). The learner's wrong form is not part of a pair at all, so no card face can carry it (inv.3).
 */
export function toAnkiContrastText(pairs: ContrastPair[]): string {
  const lines: string[] = [];
  for (const pair of pairs) {
    const options = `${field(pair.options[0])} / ${field(pair.options[1])}`;
    const frontA = `${field(pair.a.en)} 〔${options}〕`;
    const frontB = `${field(pair.b.en)} 〔${options}〕`;
    const answerA = field(pair.a.jp);
    const answerB = field(pair.b.jp);
    if (!answerA || !answerB) continue;
    lines.push([frontA, answerA, frontB, answerB].join("\t"));
  }
  return lines.join("\n");
}

/**
 * Format chunk cards as Anki import lines — `front⇥back`, one note per card. The front is the card's
 * prompt (an English situation or a cloze) and the back is the answer; the stored wrong form is never
 * emitted, so review can't rehearse the mistake (spec §6 inv.3). Cards missing a prompt or answer are
 * skipped.
 */
export function toAnkiChunkText(cards: Pick<ChunkCard, "prompt" | "answer">[]): string {
  const lines: string[] = [];
  for (const card of cards) {
    const front = field(card.prompt);
    const back = field(card.answer);
    if (!front || !back) continue;
    lines.push([front, back].join("\t"));
  }
  return lines.join("\n");
}

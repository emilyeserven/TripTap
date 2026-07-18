/**
 * Heuristics for routing an Anki/Migaku card to a Sentence or a Vocab entry. The user can override the
 * result per row in the review table, so this only needs to be a good default.
 */

import type { MigakuCandidateKind } from "@sentence-bank/types";

/** Sentence-ending punctuation that reliably marks a full sentence rather than a single word. */
const SENTENCE_PUNCT = /[。！？…]/;
/** Model/note-type name fragments that hint at the card's intent. */
const VOCAB_MODEL_HINT = /\b(vocab|word|単語|kanji)\b/i;
const SENTENCE_MODEL_HINT = /\b(sentence|文|例文)\b/i;

/**
 * Decide whether a card is a sentence or vocab from its (already ruby-stripped) text and note-type
 * name. Model-name hints win; otherwise sentence punctuation or a multi-word/long expression reads as a
 * sentence, and a short single token reads as vocab.
 */
/**
 * Whether a note type is the Migaku "Sentence" model — recognized by its signature fields (a focus
 * Word plus a Sentence, its Translated Sentence, and word Definitions). Such notes bundle a word and
 * its example sentence, so they take the paired Vocab + linked-Sentence import path.
 */
export function isMigakuModel(fieldNames: string[]): boolean {
  const names = new Set(fieldNames.map(n => n.trim().toLowerCase()));
  return names.has("word")
    && names.has("sentence")
    && names.has("translated sentence")
    && names.has("definitions");
}

export function detectKind(text: string, modelName: string | null): MigakuCandidateKind {
  const trimmed = text.trim();
  if (!trimmed) return "vocab";

  if (modelName) {
    if (SENTENCE_MODEL_HINT.test(modelName)) return "sentence";
    if (VOCAB_MODEL_HINT.test(modelName)) return "vocab";
  }

  if (SENTENCE_PUNCT.test(trimmed)) return "sentence";
  // Spaces survive only in non-Japanese text (Migaku spacing is stripped upstream); several words →
  // a sentence. For Japanese, fall back to a length threshold — single words are short.
  if (trimmed.split(/\s+/).length >= 3) return "sentence";
  return trimmed.length >= 12 ? "sentence" : "vocab";
}

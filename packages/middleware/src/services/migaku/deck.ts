/**
 * Deck helpers for Migaku imports: deriving a deck name from a filename, and bulk-deleting every bank
 * row imported under a deck (matched by its `deck:<name>` tag). Deletion goes through the per-row
 * services so Garage media is cleaned up too.
 */

import type { DeleteDeckCardsResult } from "@sentence-bank/types";
import { hasDeckTag } from "@sentence-bank/types";
import { deleteSentence, listSentences } from "@/services/sentences";
import { deleteVocab, listVocab } from "@/services/vocab";

/** Deck name from an uploaded filename: the basename without the `.apkg`/`.zip` extension. */
export function deckNameFromFilename(filename: string): string {
  const base = filename.replace(/\.(apkg|zip)$/i, "").trim();
  return base || "Imported deck";
}

/**
 * Delete every sentence/vocab tagged with this deck. Deletes one row at a time via `deleteSentence`/
 * `deleteVocab` so each row's Garage media is removed too. Returns how many of each were deleted.
 */
export async function deleteDeckCards(deckName: string): Promise<DeleteDeckCardsResult> {
  const [sentences, vocab] = await Promise.all([listSentences(), listVocab()]);
  const sentenceIds = sentences.filter(s => hasDeckTag(s.tags, deckName)).map(s => s.id);
  const vocabIds = vocab.filter(v => hasDeckTag(v.tags, deckName)).map(v => v.id);

  let sentencesDeleted = 0;
  let vocabDeleted = 0;
  for (const id of sentenceIds) {
    if (await deleteSentence(id)) sentencesDeleted += 1;
  }
  for (const id of vocabIds) {
    if (await deleteVocab(id)) vocabDeleted += 1;
  }
  return {
    sentencesDeleted,
    vocabDeleted,
  };
}

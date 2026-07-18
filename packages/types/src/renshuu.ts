/**
 * Types for the Renshuu example-sentence lookup — a read-only proxy to `api.tatoeba.org`'s cousin,
 * the renshuu.org study API (`/v1/reibun/search`). Unlike Tatoeba this needs the learner's own API
 * key (stored server-side; see {@link RenshuuSettings}). Sentences come from Renshuu's example bank.
 */

import type { FuriToken } from "./index.js";

/** One Japanese example sentence from Renshuu, with furigana and an English meaning. */
export interface RenshuuExampleSentence {
  /** Renshuu example-sentence (reibun) id. */
  id: number;
  /**
   * The Japanese sentence text, normalized toward the common written form (Renshuu over-kanjifies
   * conventionally-kana words, e.g. `此の`→`この`; those are rewritten server-side).
   */
  text: string;
  /**
   * Furigana segmentation of {@link text}, generated server-side (after normalization), or null when
   * the sentence has no kanji. Rendered as ruby just like a bank sentence, respecting the toggle.
   */
  reading: FuriToken[] | null;
  /** The English meaning (`meaning.en`), or null. */
  translation: string | null;
}

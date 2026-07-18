/**
 * Types for the Renshuu example-sentence lookup — a read-only proxy to `api.tatoeba.org`'s cousin,
 * the renshuu.org study API (`/v1/reibun/search`). Unlike Tatoeba this needs the learner's own API
 * key (stored server-side; see {@link RenshuuSettings}). Sentences come from Renshuu's example bank.
 */

/** One Japanese example sentence from Renshuu, with its kana reading and English meaning. */
export interface RenshuuExampleSentence {
  /** Renshuu example-sentence (reibun) id. */
  id: number;
  /** The Japanese sentence text. */
  text: string;
  /**
   * The whole sentence rendered in hiragana (Renshuu's `hiragana` field), or null. This is a plain
   * kana string, not aligned furigana — shown as a secondary reading line, not ruby.
   */
  reading: string | null;
  /** The English meaning (`meaning.en`), or null. */
  translation: string | null;
}

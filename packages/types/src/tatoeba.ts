/**
 * Types for the Tatoeba example-sentence lookup (a read-only proxy to `api.tatoeba.org`). Used to seed
 * a practice sentence from a word the learner got wrong. Sentences are CC-BY 2.0 FR — attribute Tatoeba.
 */

/** One Japanese example sentence from Tatoeba, with an English translation when available. */
export interface ExampleSentence {
  /** Tatoeba sentence id (for attribution / linking back). */
  id: number;
  /** The Japanese sentence text. */
  text: string;
  /** An English translation (a direct translation when one exists), or null. */
  translation: string | null;
  /** The sentence's license, e.g. "CC BY 2.0 FR". */
  license: string;
  /** The contributing user's name, or null. */
  owner: string | null;
}

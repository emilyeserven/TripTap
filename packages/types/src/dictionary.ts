/**
 * Shared "Dictionary" domain types.
 *
 * A normalized dictionary lookup result surfaced by the middleware dictionary proxy
 * (`/api/dictionary/search`). The middleware maps a provider's response (Jisho's unofficial JSON API
 * or a self-hosted Jotoba instance) into this common shape so the client renders the same result
 * regardless of provider. Consumed by both the Fastify API and the React client.
 */

/** One dictionary entry: a headword with its reading, meanings, and metadata. */
export interface DictionaryEntry {
  /** The headword — the kanji/word form, falling back to the reading for kana-only entries. */
  word: string;
  /** The kana reading. */
  reading: string;
  /** English definitions gathered across the entry's primary sense(s). */
  meanings: string[];
  /** Parts of speech for the primary sense, e.g. `["Noun", "Suru verb"]`. */
  partsOfSpeech: string[];
  /** Normalized JLPT level, e.g. `"N5"`, or null when the provider reports none. */
  jlpt: string | null;
  /** Whether the provider marks the entry as a common word. */
  common: boolean;
}

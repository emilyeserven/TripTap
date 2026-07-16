/**
 * Shared "Dictionary" domain types.
 *
 * A normalized dictionary lookup result surfaced by the middleware dictionary proxy
 * (`/api/dictionary/search`). The middleware maps a provider's response (Jisho's unofficial JSON API
 * or a self-hosted Jotoba instance) into this common shape so the client renders the same result
 * regardless of provider. Consumed by both the Fastify API and the React client.
 */

/**
 * Which upstream provider backs the lookup. Both normalize to {@link DictionaryEntry}; they differ only
 * in request shape and response parsing, so switching is a configuration change.
 *
 * - `jisho` — Jisho.org's unofficial JSON API. No auth, but unofficial and may be rate-limited/blocked.
 * - `jotoba` — a Jotoba instance (self-hostable, official API).
 */
export type DictionaryProvider = "jisho" | "jotoba";

/**
 * Dictionary integration settings as returned by `GET /api/settings/dictionary`. These are not secrets,
 * so raw values are returned. A null field falls back to the server's env var / built-in default.
 */
export interface DictionarySettings {
  /** Base URL of the dictionary API, or null to fall back to the env/default. */
  endpointUrl: string | null;
  /** The chosen provider, or null to fall back to the env/default (`jisho`). */
  provider: DictionaryProvider | null;
}

/**
 * Payload for `PATCH /api/settings/dictionary`. Tri-state per field: `undefined`/omitted leaves the
 * value unchanged, `null`/empty clears it (reverting to env/default), any other value replaces it.
 */
export interface UpdateDictionarySettingsInput {
  endpointUrl?: string | null;
  provider?: DictionaryProvider | null;
}

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

/**
 * Read-only proxy to the renshuu.org study API (`api.renshuu.org/v1/reibun/search`). Searches
 * Renshuu's example-sentence bank for a word (Japanese or English), returning each sentence with its
 * kana reading and English meaning, to seed a bank sentence from a drill mistake. Unlike Tatoeba,
 * this needs the learner's own API key (Bearer token) — resolved from the DB settings / env.
 */

import type { RenshuuExampleSentence } from "@sentence-bank/types";
import { generateFurigana } from "@/services/furigana";
import { fetchJsonWithTimeout } from "@/services/http";
import { RenshuuNotConfiguredError, RenshuuUnavailableError } from "@/services/renshuu/errors";
import { normalizeJapaneseOrthography } from "@/services/renshuu/orthography";
import { getRenshuuApiKey } from "@/services/settings";

export { RenshuuNotConfiguredError, RenshuuUnavailableError } from "@/services/renshuu/errors";

const DEFAULT_BASE_URL = "https://api.renshuu.org";
const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

/** Shape of the bits of the Renshuu `reibun/search` response we consume. */
interface RenshuuReibun {
  id?: number;
  /** The Japanese sentence text. */
  japanese?: string;
  /** The whole sentence in hiragana (a plain kana string, not aligned furigana). */
  hiragana?: string;
  /** Meaning keyed by language; we read `en`. */
  meaning?: { en?: string } | null;
}
interface RenshuuSearchResponse {
  reibuns?: RenshuuReibun[];
}

/**
 * Map a raw Renshuu reibun to our wire shape (text normalized toward the common written form; furigana
 * filled in separately by {@link searchExampleSentences}), or null when it lacks an id/text.
 */
export function toExampleSentence(raw: RenshuuReibun): RenshuuExampleSentence | null {
  if (typeof raw.id !== "number" || typeof raw.japanese !== "string" || !raw.japanese.trim()) {
    return null;
  }
  return {
    id: raw.id,
    text: normalizeJapaneseOrthography(raw.japanese),
    reading: null,
    translation: typeof raw.meaning?.en === "string" && raw.meaning.en.trim() ? raw.meaning.en : null,
  };
}

/**
 * Search Renshuu's example-sentence bank for `query` (matched against Japanese or English). Returns
 * `[]` for an empty query. Throws {@link RenshuuNotConfiguredError} when no API key is set, or
 * {@link RenshuuUnavailableError} on a network/timeout/non-2xx failure (incl. a rejected key).
 */
export async function searchExampleSentences(
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<RenshuuExampleSentence[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const apiKey = await getRenshuuApiKey();
  if (!apiKey) throw new RenshuuNotConfiguredError();

  const base = process.env.RENSHUU_API_URL?.trim() || DEFAULT_BASE_URL;
  const params = new URLSearchParams({
    value: trimmed,
  });
  const url = `${base.replace(/\/+$/, "")}/v1/reibun/search?${params.toString()}`;

  const body = await fetchJsonWithTimeout<RenshuuSearchResponse>(
    url,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
    "Renshuu",
    message => new RenshuuUnavailableError(message),
    REQUEST_TIMEOUT_MS,
  );

  // Renshuu paginates at 10/page; cap client-side so the picker stays a short list.
  const mapped = (body.reibuns ?? [])
    .slice(0, Math.min(Math.max(1, limit), MAX_LIMIT))
    .map(toExampleSentence)
    .filter((s): s is RenshuuExampleSentence => s !== null);

  // Generate ruby furigana over the normalized text so results render like bank sentences. Best-effort:
  // a generation failure just leaves that sentence without furigana (never fails the whole search).
  return Promise.all(mapped.map(async (s) => {
    const {
      tokens,
    } = await generateFurigana(s.text);
    return {
      ...s,
      reading: tokens,
    };
  }));
}

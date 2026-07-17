/**
 * Read-only proxy to the Tatoeba example-sentence API (`api.tatoeba.org/v1/sentences`). Looks up
 * Japanese sentences containing a word, with an English translation when one exists, to seed a practice
 * sentence. No auth required; sentences are CC-BY 2.0 FR (attribute Tatoeba in the UI).
 */

import type { ExampleSentence } from "@sentence-bank/types";
import { fetchJsonWithTimeout } from "@/services/http";
import { TatoebaUnavailableError } from "@/services/tatoeba/errors";

export { TatoebaUnavailableError } from "@/services/tatoeba/errors";

const DEFAULT_BASE_URL = "https://api.tatoeba.org";
const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

/** Shape of the bits of the Tatoeba `/v1/sentences` response we consume. */
interface TatoebaTranslation {
  text?: string;
  lang?: string;
  is_direct?: boolean;
}
interface TatoebaSentence {
  id?: number;
  text?: string;
  license?: string;
  owner?: string | null;
  translations?: TatoebaTranslation[];
}
interface TatoebaResponse {
  data?: TatoebaSentence[];
}

/** Pick the best English translation: a direct one if present, else any English, else null. */
function pickTranslation(translations: TatoebaTranslation[] | undefined): string | null {
  if (!translations?.length) return null;
  const english = translations.filter(t => t.lang === "eng" && typeof t.text === "string");
  const direct = english.find(t => t.is_direct);
  return (direct ?? english[0])?.text ?? null;
}

/** Map a raw Tatoeba sentence to our wire shape, or null when it lacks text/id. */
export function toExampleSentence(raw: TatoebaSentence): ExampleSentence | null {
  if (typeof raw.id !== "number" || typeof raw.text !== "string" || !raw.text.trim()) return null;
  return {
    id: raw.id,
    text: raw.text,
    translation: pickTranslation(raw.translations),
    license: raw.license ?? "CC BY 2.0 FR",
    owner: raw.owner ?? null,
  };
}

/**
 * Search Japanese example sentences containing `query`, newest-relevance first, each with an English
 * translation when available. Returns `[]` for an empty query. Throws {@link TatoebaUnavailableError}
 * on a network/timeout/non-2xx failure.
 */
export async function searchExampleSentences(
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<ExampleSentence[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const base = process.env.TATOEBA_API_URL?.trim() || DEFAULT_BASE_URL;
  const params = new URLSearchParams({
    "lang": "jpn",
    "q": trimmed,
    "trans:lang": "eng",
    "sort": "relevance",
    "limit": String(Math.min(Math.max(1, limit), MAX_LIMIT)),
  });
  const url = `${base.replace(/\/+$/, "")}/v1/sentences?${params.toString()}`;

  const body = await fetchJsonWithTimeout<TatoebaResponse>(
    url,
    {},
    "Tatoeba",
    message => new TatoebaUnavailableError(message),
    REQUEST_TIMEOUT_MS,
  );

  return (body.data ?? [])
    .map(toExampleSentence)
    .filter((s): s is ExampleSentence => s !== null);
}

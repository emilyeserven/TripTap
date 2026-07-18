/**
 * Read-only proxy to the Tatoeba example-sentence API (`tatoeba.org/en/api_v0/search`). Looks up
 * Japanese sentences containing a word, with an English translation when one exists, to seed a practice
 * sentence. No auth required; sentences are CC-BY 2.0 FR (attribute Tatoeba in the UI).
 *
 * We use the older `api_v0` search endpoint rather than the newer `api.tatoeba.org/v1` because only
 * `api_v0` returns per-sentence `transcriptions` (furigana). The tradeoff is `api_v0`'s messier shape:
 * translations arrive nested as `[direct[], indirect[]]` and furigana uses a `[漢字|かな]` bracket form.
 */

import type { ExampleSentence, FuriToken } from "@sentence-bank/types";
import { fetchJsonWithTimeout } from "@/services/http";
import { TatoebaUnavailableError } from "@/services/tatoeba/errors";

export { TatoebaUnavailableError } from "@/services/tatoeba/errors";

const DEFAULT_BASE_URL = "https://tatoeba.org";
const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

/** Shape of the bits of the Tatoeba `api_v0/search` response we consume. */
interface TatoebaTranslation {
  text?: string;
  lang?: string;
}
interface TatoebaTranscription {
  /** ISO 15924 script tag; the furigana transcription is "Hrkt" (Hiragana/Katakana). */
  script?: string;
  /** Furigana markup in Tatoeba's `[漢字|かな]` bracket form, e.g. "[負|ま]け[犬|いぬ]！". */
  text?: string;
}
interface TatoebaSentence {
  id?: number;
  text?: string;
  license?: string;
  user?: { username?: string } | null;
  /** Nested by directness: `[direct[], indirect[]]`. */
  translations?: TatoebaTranslation[][];
  transcriptions?: TatoebaTranscription[];
}
interface TatoebaResponse {
  results?: TatoebaSentence[];
}

/** Pick the best English translation. api_v0 nests as `[direct[], indirect[]]`; prefer the direct group. */
function pickTranslation(groups: TatoebaTranslation[][] | undefined): string | null {
  if (!groups?.length) return null;
  const isEng = (t: TatoebaTranslation) => t.lang === "eng" && typeof t.text === "string";
  const direct = (groups[0] ?? []).find(isEng);
  return (direct ?? groups.flat().find(isEng))?.text ?? null;
}

/**
 * Parse Tatoeba's Japanese transcription (`[漢字|かな]` bracket form) into the app's {@link FuriToken}
 * segments. Each `[base|reading…]` group becomes one ruby token — a compound sits in a single bracket
 * with its reading split per-kanji by `|` (e.g. `[勉強|べん|きょう]` → base 勉強, reading べんきょう).
 * Kana/punctuation between brackets carries a null reading.
 */
export function parseTranscription(text: string): FuriToken[] {
  const tokens: FuriToken[] = [];
  let plain = "";
  const flush = () => {
    if (plain) {
      tokens.push({
        t: plain,
        r: null,
      });
      plain = "";
    }
  };

  let i = 0;
  while (i < text.length) {
    if (text[i] === "[") {
      const close = text.indexOf("]", i);
      if (close !== -1) {
        const [base, ...readings] = text.slice(i + 1, close).split("|");
        flush();
        tokens.push({
          t: base,
          r: readings.join("") || null,
        });
        i = close + 1;
        continue;
      }
    }
    plain += text[i];
    i++;
  }
  flush();
  return tokens;
}

/**
 * Furigana for a Japanese sentence from its transcriptions: prefer the "Hrkt" (kana) transcription,
 * else the first one that actually carries bracket markup. Null when Tatoeba has no usable furigana.
 */
export function pickReading(transcriptions: TatoebaTranscription[] | undefined): FuriToken[] | null {
  if (!transcriptions?.length) return null;
  const withBrackets = transcriptions.filter(t => typeof t.text === "string" && t.text.includes("["));
  const chosen = withBrackets.find(t => t.script === "Hrkt") ?? withBrackets[0];
  if (!chosen?.text) return null;
  const reading = parseTranscription(chosen.text);
  return reading.some(token => token.r) ? reading : null;
}

/** Map a raw Tatoeba sentence to our wire shape, or null when it lacks text/id. */
export function toExampleSentence(raw: TatoebaSentence): ExampleSentence | null {
  if (typeof raw.id !== "number" || typeof raw.text !== "string" || !raw.text.trim()) return null;
  return {
    id: raw.id,
    text: raw.text,
    reading: pickReading(raw.transcriptions),
    translation: pickTranslation(raw.translations),
    license: raw.license ?? "CC BY 2.0 FR",
    owner: raw.user?.username ?? null,
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
    query: trimmed,
    from: "jpn",
    to: "eng",
    sort: "relevance",
  });
  const url = `${base.replace(/\/+$/, "")}/en/api_v0/search?${params.toString()}`;

  const body = await fetchJsonWithTimeout<TatoebaResponse>(
    url,
    {},
    "Tatoeba",
    message => new TatoebaUnavailableError(message),
    REQUEST_TIMEOUT_MS,
  );

  // api_v0 paginates rather than honoring a `limit` param, so cap client-side.
  return (body.results ?? [])
    .slice(0, Math.min(Math.max(1, limit), MAX_LIMIT))
    .map(toExampleSentence)
    .filter((s): s is ExampleSentence => s !== null);
}

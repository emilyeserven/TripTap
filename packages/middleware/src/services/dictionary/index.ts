import type { DictionaryEntry, DictionaryProvider } from "@sentence-bank/types";
import { getDictionarySettings } from "@/services/settings";
import { DictionaryNotConfiguredError } from "@/services/dictionary/errors";
import { fetchDictionaryJson } from "@/services/dictionary/util";

export { DictionaryNotConfiguredError, DictionaryUnavailableError } from "@/services/dictionary/errors";

/** Fallback base URL when neither the DB settings nor the environment configures one. */
const DEFAULT_DICTIONARY_URL = "https://jisho.org";

interface DictionaryConfig {
  baseUrl: string;
  provider: DictionaryProvider;
}

/** Coerce an arbitrary env value to a known provider, defaulting to `jisho`. */
function resolveProvider(raw: string | undefined): DictionaryProvider {
  return raw?.toLowerCase() === "jotoba" ? "jotoba" : "jisho";
}

/**
 * Resolve the effective dictionary configuration for one request. The endpoint URL and provider come
 * from the DB Settings (entered on the Settings page) and take precedence over `DICTIONARY_API_URL` /
 * `DICTIONARY_PROVIDER`, then a hardcoded default. The DB lookup is best-effort so this keeps working
 * (and unit tests run) without a database.
 */
async function resolveDictionaryConfig(): Promise<DictionaryConfig> {
  let dbEndpoint: string | null = null;
  let dbProvider: DictionaryProvider | null = null;
  try {
    const settings = await getDictionarySettings();
    dbEndpoint = settings.endpointUrl;
    dbProvider = settings.provider;
  }
  catch {
    // Database unavailable — fall back to environment/default.
  }
  const baseUrl = dbEndpoint || process.env.DICTIONARY_API_URL || DEFAULT_DICTIONARY_URL;
  if (!baseUrl) throw new DictionaryNotConfiguredError();
  return {
    baseUrl,
    provider: dbProvider ?? resolveProvider(process.env.DICTIONARY_PROVIDER),
  };
}

/** Join a configured base URL with an `/api/...` path, tolerating a trailing slash or `/api` suffix. */
function apiUrl(baseUrl: string, path: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "").replace(/\/api$/, "");
  return `${trimmed}/api${path}`;
}

/** Keep only the non-empty strings from an unknown array. */
function stringList(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string" && s !== "") : [];
}

/**
 * Normalize a JLPT marker to the `"N5"`…`"N1"` form. Accepts Jisho's `"jlpt-n5"` strings and Jotoba's
 * numeric levels; returns null for anything unrecognized.
 */
function normalizeJlpt(raw: unknown): string | null {
  if (typeof raw === "number" && raw >= 1 && raw <= 5) return `N${raw}`;
  if (typeof raw === "string") {
    const match = raw.match(/n\s*([1-5])/i);
    if (match) return `N${match[1]}`;
  }
  return null;
}

/**
 * Parse Jisho's unofficial API response (`{ data: [...] }`) into normalized entries. Each item's first
 * `japanese` form supplies the word/reading (word falls back to the reading for kana-only entries), all
 * senses' `english_definitions` are flattened into meanings, and the first sense's `parts_of_speech`
 * and the entry's `jlpt`/`is_common` fill the metadata. Malformed items are dropped.
 */
export function parseJisho(raw: unknown): DictionaryEntry[] {
  if (!raw || typeof raw !== "object") return [];
  const data = (raw as Record<string, unknown>).data;
  if (!Array.isArray(data)) return [];

  const entries: DictionaryEntry[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;

    const japanese = Array.isArray(o.japanese) ? o.japanese : [];
    const primary = (japanese[0] && typeof japanese[0] === "object" ? japanese[0] : {}) as Record<string, unknown>;
    const reading = typeof primary.reading === "string" ? primary.reading : "";
    const word = typeof primary.word === "string" ? primary.word : reading;
    if (!word && !reading) continue;

    const senses = Array.isArray(o.senses) ? o.senses : [];
    const meanings: string[] = [];
    let partsOfSpeech: string[] = [];
    senses.forEach((sense, i) => {
      if (!sense || typeof sense !== "object") return;
      const s = sense as Record<string, unknown>;
      meanings.push(...stringList(s.english_definitions));
      if (i === 0) partsOfSpeech = stringList(s.parts_of_speech);
    });

    const jlptRaw = Array.isArray(o.jlpt) ? o.jlpt[0] : o.jlpt;

    entries.push({
      word: word || reading,
      reading,
      meanings,
      partsOfSpeech,
      jlpt: normalizeJlpt(jlptRaw),
      common: o.is_common === true,
    });
  }
  return entries;
}

/** Extract a readable part-of-speech label from a Jotoba `pos` entry (a string or a single-key object). */
function jotobaPos(raw: unknown): string | null {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    const key = Object.keys(raw as Record<string, unknown>)[0];
    return key ?? null;
  }
  return null;
}

/**
 * Parse a Jotoba `POST /api/search/words` response (`{ words: [...] }`) into normalized entries. Each
 * word's `reading` supplies the kanji/kana forms, all senses' `glosses` flatten into meanings, and the
 * first sense's `pos` plus the word's `common`/`jlpt` fill the metadata. Malformed items are dropped.
 */
export function parseJotoba(raw: unknown): DictionaryEntry[] {
  if (!raw || typeof raw !== "object") return [];
  const words = (raw as Record<string, unknown>).words;
  if (!Array.isArray(words)) return [];

  const entries: DictionaryEntry[] = [];
  for (const item of words) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;

    const readingObj = (o.reading && typeof o.reading === "object" ? o.reading : {}) as Record<string, unknown>;
    const kana = typeof readingObj.kana === "string" ? readingObj.kana : "";
    const kanji = typeof readingObj.kanji === "string" ? readingObj.kanji : "";
    const word = kanji || kana;
    if (!word && !kana) continue;

    const senses = Array.isArray(o.senses) ? o.senses : [];
    const meanings: string[] = [];
    let partsOfSpeech: string[] = [];
    senses.forEach((sense, i) => {
      if (!sense || typeof sense !== "object") return;
      const s = sense as Record<string, unknown>;
      meanings.push(...stringList(s.glosses));
      if (i === 0 && Array.isArray(s.pos)) {
        partsOfSpeech = s.pos.map(jotobaPos).filter((p): p is string => p !== null);
      }
    });

    entries.push({
      word,
      reading: kana,
      meanings,
      partsOfSpeech,
      jlpt: normalizeJlpt(o.jlpt),
      common: o.common === true,
    });
  }
  return entries;
}

/**
 * Look up a Japanese word/phrase in the configured dictionary and return normalized entries. Dispatches
 * to the provider's request shape and parser. Throws {@link DictionaryNotConfiguredError} when no
 * endpoint is configured and {@link DictionaryUnavailableError} when the host is unreachable or errors.
 */
export async function searchDictionary(keyword: string): Promise<DictionaryEntry[]> {
  const {
    baseUrl, provider,
  } = await resolveDictionaryConfig();

  if (provider === "jotoba") {
    const raw = await fetchDictionaryJson<unknown>(apiUrl(baseUrl, "/search/words"), {
      method: "POST",
      body: {
        query: keyword,
        language: "English",
      },
    });
    return parseJotoba(raw);
  }

  const raw = await fetchDictionaryJson<unknown>(
    apiUrl(baseUrl, `/v1/search/words?keyword=${encodeURIComponent(keyword)}`),
  );
  return parseJisho(raw);
}

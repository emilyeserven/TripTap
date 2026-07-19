import { eq, inArray } from "drizzle-orm";
import type {
  BookmarksSettings,
  BookmarksSource,
  DictionaryProvider,
  DictionarySettings,
  LearningAreaTagMap,
  OcrSettings,
  RenshuuSettings,
  UpdateBookmarksSettingsInput,
  UpdateDictionarySettingsInput,
  UpdateOcrSettingsInput,
  UpdateRenshuuSettingsInput,
} from "@sentence-bank/types";
import { LEARNING_AREAS } from "@sentence-bank/types";
import { db } from "@/db";
import { settings } from "@/db/schema";

/**
 * Settings keys for cloud OCR credentials. Kept in one place so the OCR config resolver and the
 * settings routes agree on the storage keys.
 */
const OCR_SECRET_KEYS = {
  ocrSpaceApiKey: "ocr.ocrSpace.apiKey",
  googleVisionApiKey: "ocr.googleVision.apiKey",
} as const;

/** Read several settings at once, returning a `key → value` map (absent keys are omitted). */
async function getSettings(keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {};
  const rows = await db.select().from(settings).where(inArray(settings.key, keys));
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

/**
 * Upsert a setting. A `null` or empty value deletes the row, so "unset" and "stored empty string"
 * never diverge.
 */
async function setSetting(key: string, value: string | null): Promise<void> {
  if (value === null || value === "") {
    await db.delete(settings).where(eq(settings.key, key));
    return;
  }
  await db
    .insert(settings)
    .values({
      key,
      value,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value,
        updatedAt: new Date(),
      },
    });
}

/** Last-4-characters hint for a stored secret (used for recognition without exposing the value). */
function hint(value: string | null): string | null {
  if (!value) return null;
  return value.length <= 4 ? value : value.slice(-4);
}

/** The cloud OCR API keys stored in the DB (each `null` when unset). */
export async function getOcrSecrets(): Promise<{
  ocrSpaceApiKey: string | null;
  googleVisionApiKey: string | null;
}> {
  const stored = await getSettings(Object.values(OCR_SECRET_KEYS));
  return {
    ocrSpaceApiKey: stored[OCR_SECRET_KEYS.ocrSpaceApiKey] ?? null,
    googleVisionApiKey: stored[OCR_SECRET_KEYS.googleVisionApiKey] ?? null,
  };
}

/** Masked view of the stored cloud OCR keys for the Settings UI — never exposes raw secrets. */
export async function getOcrSettings(): Promise<OcrSettings> {
  const secrets = await getOcrSecrets();
  return {
    ocrSpace: {
      configured: Boolean(secrets.ocrSpaceApiKey),
      hint: hint(secrets.ocrSpaceApiKey),
    },
    googleVision: {
      configured: Boolean(secrets.googleVisionApiKey),
      hint: hint(secrets.googleVisionApiKey),
    },
  };
}

/**
 * Apply a partial update to the stored cloud OCR keys. Each field is tri-state: `undefined` leaves
 * the value unchanged, `""`/`null` clears it, any other string replaces it. Returns the new masked
 * view.
 */
export async function updateOcrSettings(input: UpdateOcrSettingsInput): Promise<OcrSettings> {
  if (input.ocrSpaceApiKey !== undefined) {
    await setSetting(OCR_SECRET_KEYS.ocrSpaceApiKey, input.ocrSpaceApiKey?.trim() ?? null);
  }
  if (input.googleVisionApiKey !== undefined) {
    await setSetting(OCR_SECRET_KEYS.googleVisionApiKey, input.googleVisionApiKey?.trim() ?? null);
  }
  return getOcrSettings();
}

/**
 * Settings keys for the external bookmarks tag/taxonomy integration. The chosen source is stored as a
 * JSON-encoded {@link BookmarksSource}. Neither value is a secret.
 */
const BOOKMARKS_KEYS = {
  endpointUrl: "bookmarks.endpointUrl",
  source: "bookmarks.source",
  grammarSource: "bookmarks.grammarSource",
  generalSource: "bookmarks.generalSource",
  resourceSource: "bookmarks.resourceSource",
  learningAreaTags: "bookmarks.learningAreaTags",
} as const;

/** Parse the stored learning-area → tag map, keeping only known areas with a valid `{id, name}` tag. */
function parseLearningAreaTags(raw: string | null): LearningAreaTagMap {
  const out: LearningAreaTagMap = {};
  if (!raw) return out;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const area of LEARNING_AREAS) {
      const entry = parsed[area];
      if (entry && typeof entry === "object") {
        const e = entry as Record<string, unknown>;
        if (typeof e.id === "string" && typeof e.name === "string") {
          out[area] = {
            id: e.id,
            name: e.name,
          };
        }
      }
    }
  }
  catch {
    // Corrupt value — treat as unset.
  }
  return out;
}

/** Optional `termId`/`termLabel` off a stored source: keep only when a string or explicit null. */
function parseTermField(value: unknown): string | null | undefined {
  if (value === null || typeof value === "string") return value;
  return undefined;
}

/** Parse a stored {@link BookmarksSource} JSON string, tolerating absent/corrupt values. */
function parseBookmarksSource(raw: string | null): BookmarksSource | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BookmarksSource;
    if (
      parsed
      && (parsed.kind === "tag" || parsed.kind === "taxonomy")
      && typeof parsed.id === "string"
      && typeof parsed.label === "string"
    ) {
      return {
        kind: parsed.kind,
        id: parsed.id,
        label: parsed.label,
        termId: parseTermField(parsed.termId),
        termLabel: parseTermField(parsed.termLabel),
      };
    }
    return null;
  }
  catch {
    return null;
  }
}

/** The bookmarks integration settings stored in the DB (raw values; these are not secrets). */
export async function getBookmarksSettings(): Promise<BookmarksSettings> {
  const stored = await getSettings(Object.values(BOOKMARKS_KEYS));
  return {
    endpointUrl: stored[BOOKMARKS_KEYS.endpointUrl] ?? null,
    source: parseBookmarksSource(stored[BOOKMARKS_KEYS.source] ?? null),
    grammarSource: parseBookmarksSource(stored[BOOKMARKS_KEYS.grammarSource] ?? null),
    generalSource: parseBookmarksSource(stored[BOOKMARKS_KEYS.generalSource] ?? null),
    resourceSource: parseBookmarksSource(stored[BOOKMARKS_KEYS.resourceSource] ?? null),
    learningAreaTags: parseLearningAreaTags(stored[BOOKMARKS_KEYS.learningAreaTags] ?? null),
  };
}

/**
 * Apply a partial update to the bookmarks integration settings. Each field is tri-state: `undefined`
 * leaves the value unchanged, `""`/`null` clears it, any other value replaces it. Returns the new view.
 */
export async function updateBookmarksSettings(
  input: UpdateBookmarksSettingsInput,
): Promise<BookmarksSettings> {
  if (input.endpointUrl !== undefined) {
    await setSetting(BOOKMARKS_KEYS.endpointUrl, input.endpointUrl?.trim() ?? null);
  }
  if (input.source !== undefined) {
    await setSetting(BOOKMARKS_KEYS.source, input.source ? JSON.stringify(input.source) : null);
  }
  if (input.grammarSource !== undefined) {
    await setSetting(BOOKMARKS_KEYS.grammarSource, input.grammarSource ? JSON.stringify(input.grammarSource) : null);
  }
  if (input.generalSource !== undefined) {
    await setSetting(BOOKMARKS_KEYS.generalSource, input.generalSource ? JSON.stringify(input.generalSource) : null);
  }
  if (input.resourceSource !== undefined) {
    await setSetting(BOOKMARKS_KEYS.resourceSource, input.resourceSource ? JSON.stringify(input.resourceSource) : null);
  }
  if (input.learningAreaTags !== undefined) {
    const map = input.learningAreaTags;
    const hasAny = map && Object.keys(map).length > 0;
    await setSetting(BOOKMARKS_KEYS.learningAreaTags, hasAny ? JSON.stringify(map) : null);
  }
  return getBookmarksSettings();
}

/**
 * Settings keys for the Japanese dictionary lookup integration. Neither value is a secret: the base URL
 * of the upstream (Jisho or a self-hosted Jotoba) and the chosen provider.
 */
const DICTIONARY_KEYS = {
  endpointUrl: "dictionary.endpointUrl",
  provider: "dictionary.provider",
} as const;

/** Coerce a stored provider string to a known provider, or null when absent/unrecognized. */
function parseProvider(raw: string | null): DictionaryProvider | null {
  return raw === "jisho" || raw === "jotoba" ? raw : null;
}

/** The dictionary integration settings stored in the DB (raw values; these are not secrets). */
export async function getDictionarySettings(): Promise<DictionarySettings> {
  const stored = await getSettings(Object.values(DICTIONARY_KEYS));
  return {
    endpointUrl: stored[DICTIONARY_KEYS.endpointUrl] ?? null,
    provider: parseProvider(stored[DICTIONARY_KEYS.provider] ?? null),
  };
}

/**
 * Apply a partial update to the dictionary integration settings. Each field is tri-state: `undefined`
 * leaves the value unchanged, `""`/`null` clears it (reverting to env/default), any other value
 * replaces it. Returns the new view.
 */
export async function updateDictionarySettings(
  input: UpdateDictionarySettingsInput,
): Promise<DictionarySettings> {
  if (input.endpointUrl !== undefined) {
    await setSetting(DICTIONARY_KEYS.endpointUrl, input.endpointUrl?.trim() ?? null);
  }
  if (input.provider !== undefined) {
    await setSetting(DICTIONARY_KEYS.provider, input.provider ?? null);
  }
  return getDictionarySettings();
}

/** Settings key for the Renshuu API key. Stored server-side; overrides the `RENSHUU_API_KEY` env var. */
const RENSHUU_SECRET_KEY = "renshuu.apiKey";

/** The Renshuu API key: the DB-stored value, or the `RENSHUU_API_KEY` env fallback, or null. */
export async function getRenshuuApiKey(): Promise<string | null> {
  const stored = await getSettings([RENSHUU_SECRET_KEY]);
  return stored[RENSHUU_SECRET_KEY] ?? process.env.RENSHUU_API_KEY?.trim() ?? null;
}

/** Masked view of the stored Renshuu key for the Settings UI — never exposes the raw secret. */
export async function getRenshuuSettings(): Promise<RenshuuSettings> {
  const key = await getRenshuuApiKey();
  return {
    apiKey: {
      configured: Boolean(key),
      hint: hint(key),
    },
  };
}

/**
 * Apply a partial update to the stored Renshuu key. `apiKey` is tri-state: `undefined` leaves it
 * unchanged, `""`/`null` clears it (reverting to the env fallback), any other string replaces it.
 * Returns the new masked view.
 */
export async function updateRenshuuSettings(
  input: UpdateRenshuuSettingsInput,
): Promise<RenshuuSettings> {
  if (input.apiKey !== undefined) {
    await setSetting(RENSHUU_SECRET_KEY, input.apiKey?.trim() ?? null);
  }
  return getRenshuuSettings();
}

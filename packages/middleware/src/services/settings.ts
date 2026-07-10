import { eq, inArray } from "drizzle-orm";
import type { OcrSettings, UpdateOcrSettingsInput } from "@sentence-bank/types";
import { db } from "@/db";
import { settings } from "@/db/schema";

/**
 * Settings keys for cloud OCR credentials. Kept in one place so the OCR config resolver and the
 * settings routes agree on the storage keys.
 */
export const OCR_SECRET_KEYS = {
  ocrSpaceApiKey: "ocr.ocrSpace.apiKey",
  googleVisionApiKey: "ocr.googleVision.apiKey",
} as const;

/** Read a single setting value, or `null` when it is not stored. */
export async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return row?.value ?? null;
}

/** Read several settings at once, returning a `key → value` map (absent keys are omitted). */
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {};
  const rows = await db.select().from(settings).where(inArray(settings.key, keys));
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

/**
 * Upsert a setting. A `null` or empty value deletes the row, so "unset" and "stored empty string"
 * never diverge.
 */
export async function setSetting(key: string, value: string | null): Promise<void> {
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

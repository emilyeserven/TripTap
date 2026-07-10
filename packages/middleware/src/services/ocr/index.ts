import type { OcrResult } from "@sentence-bank/types";
import type { OcrConfig, OcrProvider } from "@/services/ocr/types";
import { getOcrSecrets } from "@/services/settings";
import { OcrNotConfiguredError, OcrUnavailableError } from "@/services/ocr/errors";
import { googleVisionProvider } from "@/services/ocr/google-vision";
import { ocrSpaceProvider } from "@/services/ocr/ocr-space";
import { selfHostedProvider } from "@/services/ocr/self-hosted";

export { OcrNotConfiguredError, OcrUnavailableError } from "@/services/ocr/errors";
export type { OcrConfig, OcrProvider } from "@/services/ocr/types";

const DEFAULT_OCR_SPACE_URL = "https://api.ocr.space/parse/image";
const DEFAULT_OCR_SPACE_ENGINE = "2"; // Engine 2 supports Japanese, including vertical text.
const DEFAULT_OCR_SPACE_LANGUAGE = "jpn";
const DEFAULT_GOOGLE_VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

/**
 * All known OCR backends, in the default fallback order: the self-hosted service first (fast, local,
 * no per-request cost), then cloud providers as a safety net. Order is overridable via `OCR_PROVIDERS`.
 */
const PROVIDERS: OcrProvider[] = [
  selfHostedProvider,
  ocrSpaceProvider,
  googleVisionProvider,
];

/**
 * Resolve the effective OCR configuration for one request. Cloud API keys come from the DB Settings
 * (entered on the Settings page) and take precedence over environment variables; everything else
 * (self-hosted URL, OCR.space engine/language, endpoint overrides, provider order) comes from env.
 *
 * The DB lookup is best-effort: if the database is unreachable, we fall back to env-only config so
 * OCR keeps working (and so unit tests need no database).
 */
async function resolveOcrConfig(): Promise<OcrConfig> {
  let dbSecrets: { ocrSpaceApiKey: string | null;
    googleVisionApiKey: string | null; } = {
    ocrSpaceApiKey: null,
    googleVisionApiKey: null,
  };
  try {
    dbSecrets = await getOcrSecrets();
  }
  catch {
    // Database unavailable — fall back to environment variables only.
  }

  const providersRaw = process.env.OCR_PROVIDERS?.trim();

  return {
    selfHostedUrl: process.env.OCR_SERVICE_URL || null,
    ocrSpace: {
      apiKey: dbSecrets.ocrSpaceApiKey ?? process.env.OCR_SPACE_API_KEY ?? null,
      engine: process.env.OCR_SPACE_ENGINE || DEFAULT_OCR_SPACE_ENGINE,
      language: process.env.OCR_SPACE_LANGUAGE || DEFAULT_OCR_SPACE_LANGUAGE,
      url: process.env.OCR_SPACE_URL || DEFAULT_OCR_SPACE_URL,
    },
    googleVision: {
      apiKey: dbSecrets.googleVisionApiKey ?? process.env.GOOGLE_VISION_API_KEY ?? null,
      url: process.env.GOOGLE_VISION_URL || DEFAULT_GOOGLE_VISION_URL,
    },
    providersOrder: providersRaw
      ? providersRaw.split(",").map(id => id.trim()).filter(Boolean)
      : null,
  };
}

/**
 * Resolve the ordered list of backends to try. `config.providersOrder` (from `OCR_PROVIDERS`)
 * overrides both which providers are eligible and their order; unknown ids are ignored. When null,
 * all known providers are eligible in their default order. In every case the list is filtered to
 * providers whose configuration is actually present, so an unconfigured provider is silently skipped.
 */
function selectedProviders(config: OcrConfig): OcrProvider[] {
  const ordered = config.providersOrder
    ? config.providersOrder
      .map(id => PROVIDERS.find(p => p.id === id))
      .filter((p): p is OcrProvider => p !== undefined)
    : PROVIDERS;
  return ordered.filter(p => p.isConfigured(config));
}

/**
 * Recognize text in an image, trying each configured backend in order until one succeeds. This is
 * the single seam the route depends on; providers behind it are pluggable.
 *
 * - No backend configured → {@link OcrNotConfiguredError} (route maps to 503).
 * - Every configured backend fails → {@link OcrUnavailableError} aggregating their errors (→ 502).
 */
export async function runOcr(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<OcrResult> {
  const config = await resolveOcrConfig();
  const providers = selectedProviders(config);
  if (providers.length === 0) throw new OcrNotConfiguredError();

  const failures: string[] = [];
  for (const provider of providers) {
    try {
      return await provider.recognize(config, buffer, filename, mimetype);
    }
    catch (err) {
      if (err instanceof OcrUnavailableError) {
        failures.push(`${provider.id}: ${err.message}`);
        continue; // fall back to the next configured provider
      }
      throw err;
    }
  }

  throw new OcrUnavailableError(`All OCR backends failed — ${failures.join(" | ")}`);
}

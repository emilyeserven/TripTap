import type { OcrResult } from "@sentence-bank/types";
import type { OcrProvider } from "@/services/ocr/types";
import { OcrNotConfiguredError, OcrUnavailableError } from "@/services/ocr/errors";
import { googleVisionProvider } from "@/services/ocr/google-vision";
import { ocrSpaceProvider } from "@/services/ocr/ocr-space";
import { selfHostedProvider } from "@/services/ocr/self-hosted";

export { OcrNotConfiguredError, OcrUnavailableError } from "@/services/ocr/errors";
export type { OcrProvider } from "@/services/ocr/types";

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
 * Resolve the ordered list of backends to try. `OCR_PROVIDERS` (comma-separated provider ids, e.g.
 * `self-hosted,ocr-space`) overrides both which providers are eligible and their order; unknown ids
 * are ignored. When unset, all known providers are eligible in their default order. In every case the
 * list is filtered to providers whose configuration is actually present, so an unconfigured provider
 * is silently skipped rather than failing the request.
 */
function selectedProviders(): OcrProvider[] {
  const raw = process.env.OCR_PROVIDERS?.trim();
  const ordered = raw
    ? raw.split(",").map(id => id.trim()).filter(Boolean)
      .map(id => PROVIDERS.find(p => p.id === id))
      .filter((p): p is OcrProvider => p !== undefined)
    : PROVIDERS;
  return ordered.filter(p => p.isConfigured());
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
  const providers = selectedProviders();
  if (providers.length === 0) throw new OcrNotConfiguredError();

  const failures: string[] = [];
  for (const provider of providers) {
    try {
      return await provider.recognize(buffer, filename, mimetype);
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

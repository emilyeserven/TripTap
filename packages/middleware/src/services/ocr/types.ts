import type { OcrResult } from "@sentence-bank/types";

/**
 * A pluggable OCR backend. Each provider knows whether its own environment configuration is
 * present (`isConfigured`) and, when it is, how to turn an image into an {@link OcrResult}.
 *
 * Providers must throw {@link OcrUnavailableError} on any recoverable failure (network error,
 * timeout, non-2xx response, provider-reported error) so the orchestrator can fall back to the
 * next configured provider. They should not throw {@link OcrNotConfiguredError} — the orchestrator
 * only calls a provider after `isConfigured()` returns `true`.
 */
export interface OcrProvider {
  /** Stable identifier used in `OCR_PROVIDERS` and in per-block `engine` labels. */
  readonly id: string;
  /** True when this provider's required environment variables are present. */
  isConfigured: () => boolean;
  /** Run OCR on the image. Throws `OcrUnavailableError` on failure. */
  recognize: (buffer: Buffer, filename: string, mimetype: string) => Promise<OcrResult>;
}

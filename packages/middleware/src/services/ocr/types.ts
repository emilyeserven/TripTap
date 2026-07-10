import type { OcrResult } from "@sentence-bank/types";

/**
 * Fully-resolved OCR configuration for a single request. Built once per request by the orchestrator
 * (see `resolveOcrConfig`), merging DB-stored secrets over environment variables, so providers never
 * touch `process.env` or the DB themselves — they just read the values handed to them.
 */
export interface OcrConfig {
  /** Base URL of the self-hosted OCR service, or `null` when not configured. */
  selfHostedUrl: string | null;
  ocrSpace: {
    apiKey: string | null;
    engine: string;
    language: string;
    url: string;
  };
  googleVision: {
    apiKey: string | null;
    url: string;
  };
  /** Explicit provider order/selection (`OCR_PROVIDERS`), or `null` for the default order. */
  providersOrder: string[] | null;
}

/**
 * A pluggable OCR backend. Given the resolved {@link OcrConfig}, a provider knows whether it is
 * usable (`isConfigured`) and how to turn an image into an {@link OcrResult}.
 *
 * Providers must throw {@link OcrUnavailableError} on any recoverable failure (network error,
 * timeout, non-2xx response, provider-reported error) so the orchestrator can fall back to the
 * next configured provider. They should not throw {@link OcrNotConfiguredError} — the orchestrator
 * only calls a provider after `isConfigured()` returns `true`.
 */
export interface OcrProvider {
  /** Stable identifier used in `OCR_PROVIDERS` and in per-block `engine` labels. */
  readonly id: string;
  /** True when this provider's required configuration is present. */
  isConfigured: (config: OcrConfig) => boolean;
  /** Run OCR on the image. Throws `OcrUnavailableError` on failure. */
  recognize: (
    config: OcrConfig,
    buffer: Buffer,
    filename: string,
    mimetype: string,
  ) => Promise<OcrResult>;
}

/**
 * Base classes for the external-host proxy services (bookmarks, dictionary, handwriting, media, OCR,
 * Renshuu, Tatoeba).
 *
 * Every one of them distinguishes the same two recoverable failures — "this integration isn't set up"
 * and "it's set up but the host didn't answer" — and every one of them mapped those to 503 and 502 in
 * its own route handler. Each service keeps its own named class (the messages and `instanceof` checks
 * in service code are worth keeping specific); they now extend these, so one route helper can map any
 * of them and a new integration gets the mapping for free.
 */

/** The integration is not configured — no URL, no API key. Maps to 503. */
export class UpstreamNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamNotConfiguredError";
  }
}

/** The integration is configured but unreachable, timed out, or errored. Maps to 502. */
export class UpstreamUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamUnavailableError";
  }
}

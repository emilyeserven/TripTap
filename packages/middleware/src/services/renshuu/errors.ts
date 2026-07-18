/** No Renshuu API key is configured (neither DB setting nor env). Surfaced as HTTP 503. */
export class RenshuuNotConfiguredError extends Error {
  constructor(message = "No Renshuu API key configured. Add one on the Settings page.") {
    super(message);
    this.name = "RenshuuNotConfiguredError";
  }
}

/** The Renshuu host was unreachable, timed out, or returned an error (incl. a rejected key). HTTP 502. */
export class RenshuuUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RenshuuUnavailableError";
  }
}

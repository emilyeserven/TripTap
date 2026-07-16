/** Raised when the dictionary integration is used but no endpoint URL can be resolved. */
export class DictionaryNotConfiguredError extends Error {
  constructor(message = "Dictionary integration not configured") {
    super(message);
    this.name = "DictionaryNotConfiguredError";
  }
}

/** Raised when the configured dictionary host is unreachable, times out, or returns a non-2xx. */
export class DictionaryUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DictionaryUnavailableError";
  }
}

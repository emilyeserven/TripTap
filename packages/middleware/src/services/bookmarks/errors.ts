/** Raised when the bookmarks integration is used but no endpoint URL can be resolved. */
export class BookmarksNotConfiguredError extends Error {
  constructor(message = "Bookmarks integration not configured") {
    super(message);
    this.name = "BookmarksNotConfiguredError";
  }
}

/** Raised when the configured bookmarks host is unreachable, times out, or returns a non-2xx. */
export class BookmarksUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookmarksUnavailableError";
  }
}

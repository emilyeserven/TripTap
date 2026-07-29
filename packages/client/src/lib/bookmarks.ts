/** Default bookmarks-app base URL — mirrors the middleware's DEFAULT_BOOKMARKS_URL. */
export const DEFAULT_BOOKMARKS_APP_URL = "https://eserve-raspi.seahorse-butterfly.ts.net";

/**
 * Link into the bookmarks app for one bookmark id. `endpointUrl` is the configured base (Settings),
 * falling back to the built-in default; a trailing slash or `/api` suffix is tolerated (matching the
 * middleware's `apiUrl` normalization).
 */
export function bookmarkAppUrl(endpointUrl: string | null | undefined, bookmarkId: string): string {
  return `${bookmarksBase(endpointUrl)}/bookmarks/${encodeURIComponent(bookmarkId)}`;
}

/** Normalize the bookmarks web base from the configured endpoint (drops a trailing slash / `/api`). */
function bookmarksBase(endpointUrl: string | null | undefined): string {
  return (endpointUrl?.trim() || DEFAULT_BOOKMARKS_APP_URL)
    .replace(/\/+$/, "")
    .replace(/\/api$/, "");
}

/**
 * Link into the bookmarks app's tag page for a Grammar-source tag. The web route is `/tags/<slug>`,
 * where the slug is the tag name lowercased with whitespace collapsed to hyphens (e.g. "Comparison" →
 * `comparison`). `endpointUrl` follows the same normalization as {@link bookmarkAppUrl}.
 */
export function bookmarkTagUrl(endpointUrl: string | null | undefined, tagName: string): string {
  const slug = tagName.trim().toLowerCase().replace(/\s+/g, "-");
  return `${bookmarksBase(endpointUrl)}/tags/${encodeURIComponent(slug)}`;
}

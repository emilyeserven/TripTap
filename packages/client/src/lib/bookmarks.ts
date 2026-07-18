/** Default bookmarks-app base URL — mirrors the middleware's DEFAULT_BOOKMARKS_URL. */
export const DEFAULT_BOOKMARKS_APP_URL = "https://eserve-raspi.seahorse-butterfly.ts.net";

/**
 * Link into the bookmarks app for one bookmark id. `endpointUrl` is the configured base (Settings),
 * falling back to the built-in default; a trailing slash or `/api` suffix is tolerated (matching the
 * middleware's `apiUrl` normalization).
 */
export function bookmarkAppUrl(endpointUrl: string | null | undefined, bookmarkId: string): string {
  const base = (endpointUrl?.trim() || DEFAULT_BOOKMARKS_APP_URL)
    .replace(/\/+$/, "")
    .replace(/\/api$/, "");
  return `${base}/bookmarks/${encodeURIComponent(bookmarkId)}`;
}

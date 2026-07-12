import { BookmarksUnavailableError } from "@/services/bookmarks/errors";

/** Per-request timeout for bookmarks calls — small JSON GETs over the local Tailnet. */
export const REQUEST_TIMEOUT_MS = 10_000;

/**
 * `fetch` with an abort-based timeout, mapping the two recoverable failure modes to
 * {@link BookmarksUnavailableError}: a thrown request (DNS/connection/timeout) and a non-2xx
 * response. Returns the parsed JSON body.
 */
export async function fetchBookmarksJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
  }
  catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new BookmarksUnavailableError(`Bookmarks host unreachable: ${reason}`);
  }
  finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new BookmarksUnavailableError(`Bookmarks host returned ${res.status}`);
  }

  try {
    return (await res.json()) as T;
  }
  catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new BookmarksUnavailableError(`Bookmarks host returned invalid JSON: ${reason}`);
  }
}

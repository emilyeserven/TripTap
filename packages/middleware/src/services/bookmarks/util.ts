import { BookmarksUnavailableError } from "@/services/bookmarks/errors";

/** Per-request timeout for bookmarks calls — small JSON GETs over the local Tailnet. */
export const REQUEST_TIMEOUT_MS = 10_000;

/** Optional request shape for {@link fetchBookmarksJson} — defaults to a GET with no body. */
export interface FetchBookmarksOptions {
  method?: string;
  /** JSON-serializable request body; when present, sets `Content-Type: application/json`. */
  body?: unknown;
}

/**
 * `fetch` with an abort-based timeout, mapping the two recoverable failure modes to
 * {@link BookmarksUnavailableError}: a thrown request (DNS/connection/timeout) and a non-2xx
 * response. Returns the parsed JSON body. Supports a JSON POST/PATCH body via {@link FetchBookmarksOptions}.
 */
export async function fetchBookmarksJson<T>(url: string, opts: FetchBookmarksOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const hasBody = opts.body !== undefined;

  let res: Response;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      method: opts.method ?? (hasBody ? "POST" : "GET"),
      headers: {
        Accept: "application/json",
        ...(hasBody
          ? {
            "Content-Type": "application/json",
          }
          : {}),
      },
      ...(hasBody
        ? {
          body: JSON.stringify(opts.body),
        }
        : {}),
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

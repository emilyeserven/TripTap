/**
 * Shared JSON-over-HTTP helper for the external-host proxy services (bookmarks, dictionary). Each
 * service maps failures to its own recoverable error type via `makeError`, so callers keep the
 * service-specific 502 semantics.
 */

/** Optional request shape for {@link fetchJsonWithTimeout} — defaults to a GET with no body. */
export interface FetchJsonOptions {
  method?: string;
  /** JSON-serializable request body; when present, sets `Content-Type: application/json`. */
  body?: unknown;
  /** Extra request headers, e.g. an `Authorization` bearer token. Merged over the defaults. */
  headers?: Record<string, string>;
}

/**
 * `fetch` with an abort-based timeout, mapping the recoverable failure modes — a thrown request
 * (DNS/connection/timeout), a non-2xx response, and an unparsable body — to the error produced by
 * `makeError`. `hostLabel` names the upstream in messages (e.g. "Bookmarks host"). Returns the
 * parsed JSON body.
 */
export async function fetchJsonWithTimeout<T>(
  url: string,
  opts: FetchJsonOptions,
  hostLabel: string,
  makeError: (message: string) => Error,
  timeoutMs = 10_000,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
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
        ...opts.headers,
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
    throw makeError(`${hostLabel} unreachable: ${reason}`);
  }
  finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw makeError(`${hostLabel} returned ${res.status}`);
  }

  try {
    return (await res.json()) as T;
  }
  catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw makeError(`${hostLabel} returned invalid JSON: ${reason}`);
  }
}

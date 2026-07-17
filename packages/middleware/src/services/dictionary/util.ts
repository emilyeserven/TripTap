import { DictionaryUnavailableError } from "@/services/dictionary/errors";

/** Per-request timeout for dictionary calls — small JSON lookups against an external host. */
const REQUEST_TIMEOUT_MS = 10_000;

/** Optional request shape for {@link fetchDictionaryJson} — defaults to a GET with no body. */
export interface FetchDictionaryOptions {
  method?: string;
  /** JSON-serializable request body; when present, sets `Content-Type: application/json`. */
  body?: unknown;
}

/**
 * `fetch` with an abort-based timeout, mapping the two recoverable failure modes to
 * {@link DictionaryUnavailableError}: a thrown request (DNS/connection/timeout) and a non-2xx
 * response. Returns the parsed JSON body. Supports a JSON POST body via {@link FetchDictionaryOptions}
 * (Jotoba's search endpoint is a POST).
 */
export async function fetchDictionaryJson<T>(url: string, opts: FetchDictionaryOptions = {}): Promise<T> {
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
    throw new DictionaryUnavailableError(`Dictionary host unreachable: ${reason}`);
  }
  finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new DictionaryUnavailableError(`Dictionary host returned ${res.status}`);
  }

  try {
    return (await res.json()) as T;
  }
  catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new DictionaryUnavailableError(`Dictionary host returned invalid JSON: ${reason}`);
  }
}

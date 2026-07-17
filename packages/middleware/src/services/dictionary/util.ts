import type { FetchJsonOptions } from "@/services/http";

import { DictionaryUnavailableError } from "@/services/dictionary/errors";
import { fetchJsonWithTimeout } from "@/services/http";

/** Per-request timeout for dictionary calls — small JSON lookups against an external host. */
const REQUEST_TIMEOUT_MS = 10_000;

/** Optional request shape for {@link fetchDictionaryJson} — defaults to a GET with no body. */
export type FetchDictionaryOptions = FetchJsonOptions;

/**
 * `fetch` with an abort-based timeout, mapping the two recoverable failure modes to
 * {@link DictionaryUnavailableError}: a thrown request (DNS/connection/timeout) and a non-2xx
 * response. Returns the parsed JSON body. Supports a JSON POST body via {@link FetchDictionaryOptions}
 * (Jotoba's search endpoint is a POST).
 */
export async function fetchDictionaryJson<T>(url: string, opts: FetchDictionaryOptions = {}): Promise<T> {
  return fetchJsonWithTimeout<T>(
    url,
    opts,
    "Dictionary host",
    message => new DictionaryUnavailableError(message),
    REQUEST_TIMEOUT_MS,
  );
}

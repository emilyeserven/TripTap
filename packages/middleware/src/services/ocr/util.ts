import { OcrUnavailableError } from "@/services/ocr/errors";

/** Default per-request timeout applied to every cloud/self-hosted OCR call. */
export const REQUEST_TIMEOUT_MS = 30_000;

/** Matches any Hiragana, Katakana, or CJK ideograph — used to tag a block as Japanese vs. English. */
const JAPANESE = /[぀-ヿ㐀-鿿豈-﫿]/;

/** Best-effort script tag for a block of recognized text: "ja" if it contains kana/kanji, else "en". */
export function detectLang(text: string): string {
  return JAPANESE.test(text) ? "ja" : "en";
}

/** Normalize CRLF/CR line endings to LF so `fullText` is consistent across providers. */
export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

/**
 * `fetch` with an abort-based timeout, mapping the two recoverable failure modes to
 * {@link OcrUnavailableError}: a thrown request (DNS/connection/timeout) and a non-2xx response.
 * `label` names the backend in the error message (e.g. "OCR.space").
 */
export async function fetchOcr(
  label: string,
  input: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  }
  catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new OcrUnavailableError(`${label} unreachable: ${reason}`);
  }
  finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new OcrUnavailableError(`${label} returned ${res.status}`);
  }
  return res;
}

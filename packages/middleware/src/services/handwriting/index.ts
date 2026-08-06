/**
 * Handwriting character recognition, proxied server-side so the browser never talks to the upstream
 * directly and the recognizer stays swappable.
 *
 * The upstream is Google's input-tools handwriting endpoint
 * (`POST /request?itc=ja-t-i0-handwrit`), the same one that backs handwriting input in Google
 * Translate. It covers hiragana, katakana and kanji and returns ranked candidates, which is what the
 * "offer choices" half of the feature needs. It is, however, **undocumented and unofficial**: there
 * is no published contract, so every level of the response is parsed defensively and a shape we don't
 * recognize degrades to "no candidates" rather than throwing. No API key is required, so — like the
 * Tatoeba proxy — there is no not-configured state and no Settings UI; only `HANDWRITING_API_URL`
 * overrides the host.
 */

import type { HandwritingStroke, RecognizeHandwritingInput } from "@sentence-bank/types";

import { fetchJsonWithTimeout } from "@/services/http";
import { HandwritingUnavailableError } from "@/services/handwriting/errors";

const DEFAULT_BASE_URL = "https://inputtools.google.com";
const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;

/**
 * One stroke in the upstream's ink format: three parallel arrays — x coordinates, y coordinates, and
 * timestamps. We don't record timings, and the recognizer accepts a zero-filled third array.
 */
type InkStroke = number[][];

/**
 * Map our provider-neutral strokes to the upstream ink format. Strokes whose x/y lengths disagree, or
 * which hold no points at all, are dropped rather than sent — a mismatched pair is meaningless ink and
 * the upstream's behaviour on it is undefined.
 */
export function toInk(strokes: HandwritingStroke[]): InkStroke[] {
  return strokes
    .filter(stroke => stroke.x.length > 0 && stroke.x.length === stroke.y.length)
    .map(stroke => [[...stroke.x], [...stroke.y], stroke.x.map(() => 0)]);
}

/**
 * Pull the ranked candidate characters out of the upstream's positional response, which looks like
 * `["SUCCESS", [["<request id>", ["日", "目", "曰"], …]]]`. A failure is reported in the same envelope
 * with a non-`SUCCESS` status and no results, so anything that isn't the expected shape — a failure
 * status, a truncated array, non-string entries — yields an empty list.
 */
export function parseCandidates(body: unknown, limit: number): string[] {
  if (!Array.isArray(body) || body[0] !== "SUCCESS") return [];

  const results = body[1];
  if (!Array.isArray(results)) return [];

  const first = results[0];
  if (!Array.isArray(first)) return [];

  const candidates = first[1];
  if (!Array.isArray(candidates)) return [];

  return candidates
    .filter((candidate): candidate is string => typeof candidate === "string" && candidate.length > 0)
    .slice(0, limit);
}

/**
 * Recognize the drawn strokes, returning candidate characters best-match first. Drawing nothing is a
 * normal state (the pad calls this as strokes accumulate), so an empty canvas short-circuits to `[]`
 * instead of making a pointless round trip.
 */
export async function recognizeHandwriting(input: RecognizeHandwritingInput): Promise<string[]> {
  const ink = toInk(input.strokes);
  if (ink.length === 0) return [];

  const limit = Math.min(Math.max(1, input.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
  const base = process.env.HANDWRITING_API_URL?.trim() || DEFAULT_BASE_URL;
  const url = `${base.replace(/\/+$/, "")}/request?itc=ja-t-i0-handwrit&num=${limit}`;

  const body = await fetchJsonWithTimeout<unknown>(
    url,
    {
      method: "POST",
      body: {
        input_type: 0,
        requests: [
          {
            writing_guide: {
              writing_area_width: input.width,
              writing_area_height: input.height,
            },
            ink,
            language: "ja",
          },
        ],
      },
    },
    "Handwriting host",
    message => new HandwritingUnavailableError(message),
    REQUEST_TIMEOUT_MS,
  );

  return parseCandidates(body, limit);
}

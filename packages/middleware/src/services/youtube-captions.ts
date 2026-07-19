/**
 * Read-only proxy that turns a YouTube video's timed-text captions into practice segments for a
 * shadowing session. A YouTube iframe exposes no audio samples, so the video can't be waveform-analyzed
 * like an uploaded file; instead each caption cue — which already carries a start time, duration, and
 * text — becomes a natural segment, and short adjacent cues are merged into shadowing-sized chunks.
 *
 * The raw `timedtext` endpoint needs a signed `baseUrl` that only appears in the watch page, so we scrape
 * `ytInitialPlayerResponse` for the caption track list (the same approach the maintained transcript
 * libraries take), then fetch the chosen track as `json3`. The parsing/merging steps are pure and
 * unit-tested; only the two `fetch` calls touch the network. Requires outbound egress to youtube.com.
 */

/** No caption track (or no usable cues) for the requested video — routes map this to 404. */
export class CaptionsNotFoundError extends Error {
  constructor(message = "No captions found for this video") {
    super(message);
    this.name = "CaptionsNotFoundError";
  }
}

/** YouTube was unreachable or returned something unusable — routes map this to 502. */
export class CaptionsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptionsUnavailableError";
  }
}

/** One caption track advertised by the watch page. */
export interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  /** Human name, e.g. "Japanese" or "English (auto-generated)"; may be absent. */
  name: string;
  /** "asr" for auto-generated tracks; absent for human-authored ones. */
  kind?: string;
}

/** A single timed caption cue. */
export interface CaptionCue {
  startMs: number;
  endMs: number;
  text: string;
}

/** A merged, shadowing-sized segment derived from caption cues. */
export interface CaptionSegment {
  startMs: number;
  endMs: number;
  label: string;
}

/** Tuning for how cues are merged into segments. */
export interface CueMergeOptions {
  /** Keep growing a segment until it reaches at least this length. */
  minSegmentMs?: number;
  /** Never let a merged segment exceed this length. */
  maxSegmentMs?: number;
  /** Contiguous cues (gap ≤ this) are always merged. */
  gapMs?: number;
  /** A short segment may still merge across a gap up to this size; larger gaps are hard boundaries. */
  maxMergeGapMs?: number;
  /** Truncate very long merged labels to this many characters. */
  maxLabelChars?: number;
}

const YOUTUBE_BASE = process.env.YOUTUBE_BASE_URL?.trim() || "https://www.youtube.com";
const FETCH_TIMEOUT_MS = 10_000;
// A desktop UA + consent cookie makes the watch page reliably include the player response.
const WATCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  "Cookie": "CONSENT=YES+cb",
};

/** Extract the 11-char video id from a YouTube URL (watch, youtu.be, embed, shorts) or a bare id. */
export function parseVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  let url: URL;
  try {
    url = new URL(trimmed);
  }
  catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  }
  if (host.endsWith("youtube.com")) {
    const v = url.searchParams.get("v");
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    const m = url.pathname.match(/^\/(?:embed|shorts|v)\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
  }
  return null;
}

/** Pull the caption track list out of a watch page's `ytInitialPlayerResponse`. */
export function extractCaptionTracks(html: string): CaptionTrack[] {
  const marker = "ytInitialPlayerResponse";
  const at = html.indexOf(marker);
  if (at === -1) return [];
  const brace = html.indexOf("{", at);
  if (brace === -1) return [];
  const json = sliceBalancedJson(html, brace);
  if (!json) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  }
  catch {
    return [];
  }
  const tracks = (parsed as {
    captions?: {
      playerCaptionsTracklistRenderer?: {
        captionTracks?: {
          baseUrl?: string;
          languageCode?: string;
          kind?: string;
          name?: { simpleText?: string;
            runs?: { text?: string }[]; };
        }[];
      };
    };
  })?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(tracks)) return [];

  return tracks
    .filter((t): t is { baseUrl: string;
      languageCode: string; } & typeof t =>
      typeof t.baseUrl === "string" && typeof t.languageCode === "string")
    .map(t => ({
      baseUrl: t.baseUrl,
      languageCode: t.languageCode,
      name: t.name?.simpleText ?? t.name?.runs?.map(r => r.text ?? "").join("") ?? "",
      ...(t.kind
        ? {
          kind: t.kind,
        }
        : {}),
    }));
}

/** Map a few common language display names to their track code prefix. */
const LANGUAGE_CODES: Record<string, string> = {
  japanese: "ja",
  english: "en",
  korean: "ko",
  chinese: "zh",
  spanish: "es",
  french: "fr",
  german: "de",
  italian: "it",
  portuguese: "pt",
  russian: "ru",
};

/**
 * Pick the best caption track for a requested language (a BCP-47 code or an English display name).
 * Prefers a human-authored track in the language, then any track in the language, then a human track in
 * any language, then the first track. Returns null only when there are no tracks at all.
 */
export function pickCaptionTrack(tracks: CaptionTrack[], lang?: string | null): CaptionTrack | null {
  if (tracks.length === 0) return null;
  const wanted = lang?.trim().toLowerCase();
  const code = wanted ? (LANGUAGE_CODES[wanted] ?? wanted.slice(0, 2)) : null;
  const inLang = code
    ? tracks.filter(t => t.languageCode.toLowerCase().startsWith(code))
    : [];
  return (
    inLang.find(t => t.kind !== "asr")
    ?? inLang[0]
    ?? tracks.find(t => t.kind !== "asr")
    ?? tracks[0]
  );
}

/** Parse a `json3` timed-text payload into cues, dropping empty/whitespace-only events. */
export function json3ToCues(payload: unknown): CaptionCue[] {
  const events = (payload as {
    events?: { tStartMs?: number;
      dDurationMs?: number;
      segs?: { utf8?: string }[]; }[];
  })?.events;
  if (!Array.isArray(events)) return [];
  const cues: CaptionCue[] = [];
  for (const ev of events) {
    if (typeof ev.tStartMs !== "number" || !Array.isArray(ev.segs)) continue;
    const text = ev.segs.map(s => s.utf8 ?? "").join("").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const startMs = Math.max(0, Math.round(ev.tStartMs));
    const endMs = startMs + Math.max(0, Math.round(ev.dDurationMs ?? 0));
    cues.push({
      startMs,
      endMs: endMs > startMs ? endMs : startMs + 1000,
      text,
    });
  }
  return cues;
}

/** Merge short adjacent cues into shadowing-sized segments. */
export function cuesToSegments(cues: CaptionCue[], opts: CueMergeOptions = {}): CaptionSegment[] {
  const {
    minSegmentMs = 1500, maxSegmentMs = 8000, gapMs = 400, maxMergeGapMs = 1200, maxLabelChars = 120,
  } = opts;
  const segments: CaptionSegment[] = [];
  let cur: CaptionSegment | null = null;

  for (const cue of cues) {
    if (!cur) {
      cur = {
        startMs: cue.startMs,
        endMs: cue.endMs,
        label: cue.text,
      };
      continue;
    }
    const curDur = cur.endMs - cur.startMs;
    const wouldSpan = cue.endMs - cur.startMs;
    const gap = cue.startMs - cur.endMs;
    // Merge near-contiguous cues always; merge across a bigger gap only to pad out a still-too-short
    // segment, and never across a large gap (a real boundary) or past the max span.
    if (
      wouldSpan <= maxSegmentMs
      && (gap <= gapMs || (curDur < minSegmentMs && gap <= maxMergeGapMs))
    ) {
      cur.endMs = cue.endMs;
      cur.label = `${cur.label} ${cue.text}`;
    }
    else {
      segments.push(cur);
      cur = {
        startMs: cue.startMs,
        endMs: cue.endMs,
        label: cue.text,
      };
    }
  }
  if (cur) segments.push(cur);

  return segments.map(s => ({
    ...s,
    label: s.label.length > maxLabelChars ? `${s.label.slice(0, maxLabelChars - 1)}…` : s.label,
  }));
}

/** `fetch` a text body with an abort timeout, mapping failures to `CaptionsUnavailableError`. */
async function fetchText(url: string, headers?: Record<string, string>): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers,
    });
  }
  catch (err) {
    throw new CaptionsUnavailableError(
      `YouTube unreachable: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  finally {
    clearTimeout(timeout);
  }
  if (!res.ok) throw new CaptionsUnavailableError(`YouTube returned ${res.status}`);
  return res.text();
}

/**
 * Fetch a video's captions and return them as merged practice segments (without ids — the client stamps
 * `ShadowingSegment` ids). Throws `CaptionsNotFoundError` when the video has no usable captions and
 * `CaptionsUnavailableError` when YouTube can't be reached.
 */
export async function fetchCaptionSegments(
  videoUrl: string,
  lang?: string | null,
  opts?: CueMergeOptions,
): Promise<CaptionSegment[]> {
  const videoId = parseVideoId(videoUrl);
  if (!videoId) throw new CaptionsNotFoundError("Not a recognizable YouTube video URL");

  const html = await fetchText(`${YOUTUBE_BASE}/watch?v=${videoId}`, WATCH_HEADERS);
  const tracks = extractCaptionTracks(html);
  const track = pickCaptionTrack(tracks, lang);
  if (!track) throw new CaptionsNotFoundError();

  const trackUrl = track.baseUrl.includes("fmt=")
    ? track.baseUrl
    : `${track.baseUrl}&fmt=json3`;
  const body = await fetchText(trackUrl);
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  }
  catch {
    throw new CaptionsNotFoundError();
  }
  const segments = cuesToSegments(json3ToCues(payload), opts);
  if (segments.length === 0) throw new CaptionsNotFoundError();
  return segments;
}

/**
 * Scan `source` from `start` (which must index a `{`) and return the balanced-brace JSON substring, or
 * null if it never balances. String-aware so braces inside string literals don't miscount.
 */
function sliceBalancedJson(source: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === "\"") inString = false;
      continue;
    }
    if (ch === "\"") inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

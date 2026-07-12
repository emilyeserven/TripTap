/**
 * Time helpers shared by the Listen-and-Shadow and Shadowing features. Timestamps are stored and
 * passed around as whole milliseconds; the YouTube player reports seconds (a float) which we multiply
 * by 1000 at the boundary.
 */

/** Format a millisecond duration as `HH:MM:SS.mmm`. Ported from the reference note-taker app. */
export function formatTime(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(clamped / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = clamped % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

/**
 * Parse a bookmark Section's raw `startValue`/`endValue` into milliseconds. The upstream format is not
 * pinned by the schema, so this is tolerant:
 *   - colon-delimited `HH:MM:SS[.mmm]` or `MM:SS[.mmm]` → summed to ms;
 *   - a bare number → seconds (fractional allowed) → ms.
 * Returns `null` when the value can't be parsed.
 */
export function parseSectionTime(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    if (parts.length < 2 || parts.length > 3) return null;
    const nums = parts.map(p => Number(p));
    if (nums.some(n => Number.isNaN(n) || n < 0)) return null;
    const [h, m, s] = parts.length === 3 ? nums : [0, nums[0], nums[1]];
    return Math.round((h * 3600 + m * 60 + s) * 1000);
  }
  const seconds = Number(trimmed);
  if (Number.isNaN(seconds) || seconds < 0) return null;
  return Math.round(seconds * 1000);
}

/**
 * Extract a YouTube video id from a URL or bare id. Handles `watch?v=`, `youtu.be/`, `/embed/`, and
 * `/shorts/` forms. Returns `null` when no 11-char id can be found.
 */
export function parseYouTubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.slice(1, 12);
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const match = url.pathname.match(/\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/);
      if (match) return match[1];
    }
    return null;
  }
  catch {
    return null;
  }
}

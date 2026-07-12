/**
 * The imperative surface a video/stopwatch player exposes to the note-capture and segment-loop logic.
 * Keeping it player-agnostic lets the YouTube player and the stopwatch fallback be swapped freely — the
 * capture logic only ever reads `getCurrentTimeMs()` and drives playback through these methods.
 */
export interface PlayerHandle {
  /** Current playback (or stopwatch) position in whole milliseconds. */
  getCurrentTimeMs: () => number;
  /** Seek to a position in milliseconds. No-op for a stopwatch. */
  seekToMs: (ms: number) => void;
  play: () => void;
  pause: () => void;
}

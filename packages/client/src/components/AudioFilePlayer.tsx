import type { PlayerHandle } from "@/lib/player";

import { forwardRef, useImperativeHandle, useRef } from "react";

/**
 * An `<audio>`-backed player satisfying the same {@link PlayerHandle} contract as the YouTube and
 * stopwatch players, so the segment-loop engine and note-taker drive it identically. Used when a
 * shadowing session has an uploaded audio file instead of (or in addition to) a video URL.
 */
export const AudioFilePlayer = forwardRef<PlayerHandle, {
  /** Audio source: an object URL for a freshly-picked file, or the stored `/audio` endpoint. */
  src: string;
}>(function AudioFilePlayer({
  src,
}, ref) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useImperativeHandle(ref, () => ({
    getCurrentTimeMs: () => Math.round((audioRef.current?.currentTime ?? 0) * 1000),
    seekToMs: (ms) => {
      const el = audioRef.current;
      if (el) el.currentTime = Math.max(0, ms) / 1000;
    },
    play: () => {
      // Playback can reject (autoplay policy); the user can still hit the native controls.
      void audioRef.current?.play().catch(() => undefined);
    },
    pause: () => audioRef.current?.pause(),
  }), []);

  return (
    <audio
      ref={audioRef}
      src={src}
      controls
      preload="metadata"
      className="w-full"
    >
      <track kind="captions" />
    </audio>
  );
});

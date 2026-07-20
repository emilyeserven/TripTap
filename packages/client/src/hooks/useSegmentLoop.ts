import type { PlayerHandle } from "@/lib/player";
import type { ShadowingSegment } from "@sentence-bank/types";
import type { RefObject } from "react";

import { useEffect, useRef, useState } from "react";

/** A segment's effective replay count, falling back to the session default. */
function effectiveMaxReplays(seg: ShadowingSegment, fallback: number): number {
  return seg.maxReplays ?? fallback;
}

/** A segment's effective inter-rep gap (ms), falling back to the session default. */
function effectiveGapMs(seg: ShadowingSegment, fallback: number): number {
  return seg.gapMs ?? fallback;
}

/**
 * Drive automatic segment looping over a {@link PlayerHandle}. Each segment plays from `startMs` to
 * `endMs`, pauses for the effective gap, and repeats until the effective replay count is reached, then
 * auto-advances to the next segment. All the moving parts (indices, counters, timers) live in refs so
 * the 100 ms poll never goes stale; a little display state (`currentIndex`, `repCount`, `isRunning`) is
 * mirrored out for the UI.
 */
export function useSegmentLoop({
  playerRef,
  segments,
  defaultMaxReplays,
  defaultGapMs,
  onRepComplete,
}: {
  playerRef: RefObject<PlayerHandle | null>;
  segments: ShadowingSegment[];
  defaultMaxReplays: number;
  defaultGapMs: number;
  /** Fires once per completed playback pass (including the final one before auto-advancing). */
  onRepComplete?: () => void;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [repCount, setRepCount] = useState(0);

  const indexRef = useRef(0);
  const repRef = useRef(0);
  // `busy` suppresses the end-check while a seek is settling or a gap is pending, so one crossing of
  // `endMs` counts exactly once.
  const busyRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gapRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the latest segments/defaults readable from inside the interval without re-subscribing.
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  const maxRef = useRef(defaultMaxReplays);
  maxRef.current = defaultMaxReplays;
  const gapMsRef = useRef(defaultGapMs);
  gapMsRef.current = defaultGapMs;
  const onRepCompleteRef = useRef(onRepComplete);
  onRepCompleteRef.current = onRepComplete;

  const clearGap = () => {
    if (gapRef.current) {
      clearTimeout(gapRef.current);
      gapRef.current = null;
    }
  };
  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const setIndex = (i: number) => {
    indexRef.current = i;
    setCurrentIndex(i);
  };
  const setRep = (r: number) => {
    repRef.current = r;
    setRepCount(r);
  };

  const enterSegment = (i: number) => {
    const seg = segmentsRef.current[i];
    if (!seg) return;
    busyRef.current = true;
    playerRef.current?.seekToMs(seg.startMs);
    playerRef.current?.play();
  };

  const advance = () => {
    const next = indexRef.current + 1;
    if (next < segmentsRef.current.length) {
      setIndex(next);
      setRep(0);
      enterSegment(next);
    }
    else {
      stop();
    }
  };

  const onSegmentEnd = () => {
    const seg = segmentsRef.current[indexRef.current];
    if (!seg) return;
    playerRef.current?.pause();
    onRepCompleteRef.current?.();
    const nextRep = repRef.current + 1;
    if (nextRep < effectiveMaxReplays(seg, maxRef.current)) {
      setRep(nextRep);
      clearGap();
      gapRef.current = setTimeout(() => {
        playerRef.current?.seekToMs(seg.startMs);
        playerRef.current?.play();
      }, effectiveGapMs(seg, gapMsRef.current));
    }
    else {
      advance();
    }
  };

  const ensurePolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(() => {
      const seg = segmentsRef.current[indexRef.current];
      if (!seg) return;
      const t = playerRef.current?.getCurrentTimeMs() ?? 0;
      if (busyRef.current) {
        // Re-arm once the seek has landed inside the segment.
        if (t < seg.endMs) busyRef.current = false;
        return;
      }
      if (t >= seg.endMs) {
        busyRef.current = true;
        onSegmentEnd();
      }
    }, 100);
  };

  const start = () => {
    if (segmentsRef.current.length === 0) return;
    clearGap();
    setIndex(0);
    setRep(0);
    setIsRunning(true);
    enterSegment(0);
    ensurePolling();
  };

  function stop() {
    clearPoll();
    clearGap();
    busyRef.current = false;
    setIsRunning(false);
    playerRef.current?.pause();
  }

  const restartCurrent = () => {
    setRep(0);
    enterSegment(indexRef.current);
  };

  const skipNext = () => {
    clearGap();
    advance();
  };

  const jumpTo = (i: number) => {
    if (i < 0 || i >= segmentsRef.current.length) return;
    clearGap();
    setIsRunning(true);
    setIndex(i);
    setRep(0);
    enterSegment(i);
    ensurePolling();
  };

  useEffect(() => () => {
    clearPoll();
    clearGap();
  }, []);

  return {
    isRunning,
    currentIndex,
    repCount,
    start,
    stop,
    restartCurrent,
    skipNext,
    jumpTo,
  };
}

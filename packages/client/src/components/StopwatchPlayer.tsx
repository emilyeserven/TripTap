import type { PlayerHandle } from "@/lib/player";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/time";

/**
 * A wall-clock stopwatch that satisfies the same {@link PlayerHandle} contract as the YouTube player,
 * used as the fallback when a video can't be embedded/read. `seekToMs` rebases the elapsed time so the
 * segment-loop engine can still "restart" a segment. Elapsed time is derived from `Date.now()` so it
 * stays accurate even if the tick interval drifts.
 */
export const StopwatchPlayer = forwardRef<PlayerHandle, {
  onTick?: (ms: number) => void;
  onRunningChange?: (running: boolean) => void;
}>(function StopwatchPlayer({
  onTick, onRunningChange,
}, ref) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(false);
  const elapsedRef = useRef(0);
  const startEpochRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  const onRunningChangeRef = useRef(onRunningChange);
  onRunningChangeRef.current = onRunningChange;

  const clear = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const setElapsed = (ms: number) => {
    elapsedRef.current = ms;
    setElapsedMs(ms);
    onTickRef.current?.(ms);
  };

  const start = () => {
    if (intervalRef.current) return;
    setRunning(true);
    onRunningChangeRef.current?.(true);
    startEpochRef.current = Date.now() - elapsedRef.current;
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startEpochRef.current);
    }, 100);
  };

  const stop = () => {
    clear();
    setRunning(false);
    onRunningChangeRef.current?.(false);
  };

  useImperativeHandle(ref, () => ({
    getCurrentTimeMs: () => elapsedRef.current,
    seekToMs: (ms) => {
      const next = Math.max(0, ms);
      startEpochRef.current = Date.now() - next;
      setElapsed(next);
    },
    play: start,
    pause: stop,
  }), []);

  useEffect(() => () => clear(), []);

  return (
    <div
      className="
        flex flex-col items-center gap-4 rounded-md border bg-muted/30 p-6
      "
    >
      <p className="text-sm text-muted-foreground">
        No playable video — using a stopwatch. Notes are stamped with the elapsed time.
      </p>
      <div className="font-mono text-4xl font-bold tabular-nums">{formatTime(elapsedMs)}</div>
      <div className="flex gap-2">
        {running
          ? (
            <Button
              type="button"
              onClick={stop}
            >
              Stop
            </Button>
          )
          : (
            <Button
              type="button"
              onClick={start}
            >
              Start
            </Button>
          )}
        <Button
          type="button"
          variant="outline"
          disabled={elapsedMs === 0 && !running}
          onClick={() => {
            stop();
            setElapsed(0);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
});

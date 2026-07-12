import type { PlayerHandle } from "@/lib/player";
import type { YTPlayer } from "@/lib/youtube";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import { loadYouTubeApi } from "@/lib/youtube";

/**
 * A YouTube IFrame player that exposes a {@link PlayerHandle} (imperative ref) plus tick/running
 * callbacks. The current time is polled and pushed through `onTick` so consumers can keep it in a ref
 * without re-rendering per tick. Swappable with the stopwatch fallback — both share the same contract.
 */
export const YouTubePlayer = forwardRef<PlayerHandle, {
  videoId: string;
  onTick?: (ms: number) => void;
  onRunningChange?: (running: boolean) => void;
  onReady?: () => void;
}>(function YouTubePlayer({
  videoId, onTick, onRunningChange, onReady,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const currentMsRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep callbacks in refs so the effect that builds the player doesn't re-run when they change.
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  const onRunningChangeRef = useRef(onRunningChange);
  onRunningChangeRef.current = onRunningChange;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useImperativeHandle(ref, () => ({
    getCurrentTimeMs: () => currentMsRef.current,
    seekToMs: (ms) => {
      playerRef.current?.seekTo(Math.max(0, ms) / 1000, true);
      currentMsRef.current = Math.max(0, ms);
    },
    play: () => playerRef.current?.playVideo(),
    pause: () => playerRef.current?.pauseVideo(),
  }), []);

  useEffect(() => {
    let cancelled = false;
    const mount = containerRef.current;
    if (!mount) return;

    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => {
        const secs = playerRef.current?.getCurrentTime();
        if (typeof secs === "number") {
          currentMsRef.current = Math.round(secs * 1000);
          onTickRef.current?.(currentMsRef.current);
        }
      }, 100);
    };
    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    void loadYouTubeApi().then((YT) => {
      if (cancelled || !containerRef.current) return;
      const host = document.createElement("div");
      containerRef.current.appendChild(host);
      playerRef.current = new YT.Player(host, {
        videoId,
        playerVars: {
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: () => onReadyRef.current?.(),
          onStateChange: (event) => {
            const running = event.data === YT.PlayerState.PLAYING;
            onRunningChangeRef.current?.(running);
            if (running) startPolling();
            else stopPolling();
            // Push one immediate reading on any state change so a pause snaps to the exact position.
            const secs = playerRef.current?.getCurrentTime();
            if (typeof secs === "number") {
              currentMsRef.current = Math.round(secs * 1000);
              onTickRef.current?.(currentMsRef.current);
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      stopPolling();
      playerRef.current?.destroy();
      playerRef.current = null;
      currentMsRef.current = 0;
      if (mount) mount.replaceChildren();
    };
  }, [videoId]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
      <div
        ref={containerRef}
        className="
          size-full
          [&_iframe]:size-full
        "
      />
    </div>
  );
});

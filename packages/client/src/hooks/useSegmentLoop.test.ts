import type { PlayerHandle } from "@/lib/player";
import type { ShadowingSegment } from "@sentence-bank/types";

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSegmentLoop } from "./useSegmentLoop";

/** A controllable fake player: seeking moves the clock, and tests set `time` to cross segment ends. */
function fakePlayer() {
  const state = {
    time: 0,
  };
  const player: PlayerHandle = {
    getCurrentTimeMs: () => state.time,
    seekToMs: (ms) => {
      state.time = ms;
    },
    play: vi.fn(),
    pause: vi.fn(),
  };
  return {
    state,
    player,
  };
}

const segment: ShadowingSegment = {
  id: "seg-1",
  label: null,
  startMs: 0,
  endMs: 1000,
  maxReplays: 2,
  gapMs: 0,
};

describe("useSegmentLoop", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires onRepComplete once per completed pass, including the final one", () => {
    const {
      state, player,
    } = fakePlayer();
    const playerRef = {
      current: player,
    };
    const onRepComplete = vi.fn();

    const {
      result,
    } = renderHook(() => useSegmentLoop({
      playerRef,
      segments: [segment],
      defaultMaxReplays: 3,
      defaultGapMs: 0,
      onRepComplete,
    }));

    act(() => result.current.start());

    const completeOnePass = () => {
      // One poll tick inside the segment re-arms the end-check, then the clock crosses endMs.
      act(() => vi.advanceTimersByTime(100));
      state.time = 1000;
      act(() => vi.advanceTimersByTime(100));
    };

    completeOnePass();
    expect(onRepComplete).toHaveBeenCalledTimes(1);

    // The zero-length gap timer re-seeks to the segment start for rep 2.
    act(() => vi.advanceTimersByTime(0));
    completeOnePass();
    // The final pass (maxReplays reached) still counts before the loop advances/stops.
    expect(onRepComplete).toHaveBeenCalledTimes(2);
    expect(result.current.isRunning).toBe(false);
  });
});

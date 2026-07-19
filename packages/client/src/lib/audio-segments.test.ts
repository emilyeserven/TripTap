import { describe, expect, it } from "vitest";

import { detectFromSamples, toShadowingSegments } from "./audio-segments";

/** Build a sample array (1 sample/ms at sampleRate 1000) from [durationMs, amplitude] spans. */
function buildSamples(spans: [number, number][]): Float32Array {
  const total = spans.reduce((n, [ms]) => n + ms, 0);
  const out = new Float32Array(total);
  let at = 0;
  for (const [ms, amp] of spans) {
    for (let i = 0; i < ms; i += 1) {
      // Alternate sign so a constant-amplitude span has a non-trivial RMS.
      out[at + i] = i % 2 === 0 ? amp : -amp;
    }
    at += ms;
  }
  return out;
}

const SAMPLE_RATE = 1000; // 1 sample per ms keeps the arithmetic readable

describe("detectFromSamples", () => {
  it("splits two utterances separated by a silent gap", () => {
    const samples = buildSamples([
      [500, 0], // lead-in silence
      [1000, 0.5], // utterance 1
      [500, 0], // gap (≥ minSilenceMs) → boundary
      [800, 0.5], // utterance 2
    ]);
    const ranges = detectFromSamples(samples, SAMPLE_RATE, {
      minSilenceMs: 350,
      silenceThreshold: 0.05,
      padMs: 100,
      minSegmentMs: 300,
    });
    expect(ranges).toHaveLength(2);
    // Utterance 1 ≈ 500–1500ms (± padding/quantization).
    expect(ranges[0].startMs).toBeGreaterThanOrEqual(350);
    expect(ranges[0].startMs).toBeLessThanOrEqual(550);
    expect(ranges[0].endMs).toBeGreaterThanOrEqual(1450);
    expect(ranges[0].endMs).toBeLessThanOrEqual(1700);
    // Utterance 2 starts after the gap and the two never overlap.
    expect(ranges[1].startMs).toBeGreaterThan(ranges[0].endMs);
    expect(ranges[1].endMs).toBeLessThanOrEqual(2800);
  });

  it("keeps one continuous utterance as a single segment", () => {
    const samples = buildSamples([[100, 0], [2000, 0.5], [100, 0]]);
    const ranges = detectFromSamples(samples, SAMPLE_RATE, {
      silenceThreshold: 0.05,
    });
    expect(ranges).toHaveLength(1);
  });

  it("returns nothing for pure silence or empty input", () => {
    expect(detectFromSamples(buildSamples([[2000, 0]]), SAMPLE_RATE, {
      silenceThreshold: 0.05,
    })).toEqual([]);
    expect(detectFromSamples(new Float32Array(0), SAMPLE_RATE)).toEqual([]);
  });

  it("does not split on a gap shorter than minSilenceMs", () => {
    const samples = buildSamples([
      [800, 0.5],
      [200, 0], // short gap (< 350ms) → stays merged
      [800, 0.5],
    ]);
    const ranges = detectFromSamples(samples, SAMPLE_RATE, {
      minSilenceMs: 350,
      silenceThreshold: 0.05,
    });
    expect(ranges).toHaveLength(1);
  });
});

describe("toShadowingSegments", () => {
  it("stamps unique ids and null overrides", () => {
    const segments = toShadowingSegments([
      {
        startMs: 0,
        endMs: 1000,
      },
      {
        startMs: 1500,
        endMs: 2500,
      },
    ]);
    expect(segments).toHaveLength(2);
    expect(segments[0].id).not.toEqual(segments[1].id);
    expect(segments[0]).toMatchObject({
      label: null,
      startMs: 0,
      endMs: 1000,
      maxReplays: null,
      gapMs: null,
    });
  });
});

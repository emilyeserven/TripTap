/**
 * Waveform-based segment suggestion for shadowing practice, in the spirit of WorkAudiobook: decode an
 * uploaded audio file, find the natural chunks of speech by splitting on silent gaps, and turn each
 * chunk into a loopable {@link ShadowingSegment}. Pure Web Audio + arithmetic — no dependency.
 *
 * The detection itself works on a raw sample array ({@link detectFromSamples}) so it's unit-testable
 * without a browser; {@link decodeAudioFile}/{@link detectSegments} are the thin Web-Audio wrappers the
 * app actually calls.
 */

import type { ShadowingSegment } from "@sentence-bank/types";

import { newId } from "@/lib/id";

/** A detected time range within the audio, in whole milliseconds. */
export interface SegmentRange {
  startMs: number;
  endMs: number;
}

/** Tuning for silence-gap detection. Defaults suit clean spoken audio. */
export interface DetectOptions {
  /** RMS analysis window, in ms. */
  windowMs?: number;
  /** A pause at least this long separates two segments. */
  minSilenceMs?: number;
  /** Linear amplitude (0–1) below which a window counts as silence (~0.01 ≈ -40 dB). */
  silenceThreshold?: number;
  /** Drop/extend segments so none is shorter than this. */
  minSegmentMs?: number;
  /** Pad each segment by this much on both sides so onsets/tails aren't clipped. */
  padMs?: number;
}

/**
 * Split a mono sample array into voiced segments separated by silent gaps. Computes per-window RMS,
 * marks windows as voiced/silent against `silenceThreshold`, and closes a segment once silence runs for
 * at least `minSilenceMs`. Each segment is padded, clamped to the clip, and grown to `minSegmentMs`.
 */
export function detectFromSamples(
  samples: Float32Array,
  sampleRate: number,
  opts: DetectOptions = {},
): SegmentRange[] {
  const {
    windowMs = 20,
    minSilenceMs = 350,
    silenceThreshold = 0.01,
    minSegmentMs = 500,
    padMs = 100,
  } = opts;
  if (samples.length === 0 || sampleRate <= 0) return [];

  const win = Math.max(1, Math.floor((sampleRate * windowMs) / 1000));
  const windowCount = Math.ceil(samples.length / win);
  const minSilenceWindows = Math.max(1, Math.round(minSilenceMs / windowMs));
  const totalMs = (samples.length / sampleRate) * 1000;

  // Collect [firstWindow, lastWindow] index ranges of voiced audio.
  const ranges: [number, number][] = [];
  let segStart: number | null = null;
  let lastVoiced = -1;
  let silenceRun = 0;

  for (let w = 0; w < windowCount; w += 1) {
    const start = w * win;
    const end = Math.min(samples.length, start + win);
    let sumSq = 0;
    for (let i = start; i < end; i += 1) sumSq += samples[i] * samples[i];
    const rms = Math.sqrt(sumSq / (end - start));

    if (rms >= silenceThreshold) {
      if (segStart === null) segStart = w;
      lastVoiced = w;
      silenceRun = 0;
    }
    else if (segStart !== null) {
      silenceRun += 1;
      if (silenceRun >= minSilenceWindows) {
        ranges.push([segStart, lastVoiced]);
        segStart = null;
        silenceRun = 0;
      }
    }
  }
  if (segStart !== null) ranges.push([segStart, lastVoiced]);

  return ranges.map(([a, b]) => {
    const startMs = Math.max(0, a * windowMs - padMs);
    let endMs = Math.min(totalMs, (b + 1) * windowMs + padMs);
    if (endMs - startMs < minSegmentMs) endMs = Math.min(totalMs, startMs + minSegmentMs);
    return {
      startMs: Math.round(startMs),
      endMs: Math.round(endMs),
    };
  });
}

/** Mix an AudioBuffer down to mono and run {@link detectFromSamples}. */
export function detectSegments(buffer: AudioBuffer, opts: DetectOptions = {}): SegmentRange[] {
  const {
    numberOfChannels, length, sampleRate,
  } = buffer;
  let mono: Float32Array;
  if (numberOfChannels === 1) {
    mono = buffer.getChannelData(0);
  }
  else {
    mono = new Float32Array(length);
    for (let ch = 0; ch < numberOfChannels; ch += 1) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i += 1) mono[i] += data[i] / numberOfChannels;
    }
  }
  return detectFromSamples(mono, sampleRate, opts);
}

/** Decode a File or ArrayBuffer into an AudioBuffer using the Web Audio API. */
export async function decodeAudioFile(source: File | ArrayBuffer): Promise<AudioBuffer> {
  const arrayBuffer = source instanceof ArrayBuffer ? source : await source.arrayBuffer();
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) throw new Error("Web Audio is not available in this browser");
  const ctx = new Ctx();
  try {
    // `decodeAudioData` copies the buffer, so it's safe to close the context afterwards.
    return await ctx.decodeAudioData(arrayBuffer.slice(0));
  }
  finally {
    void ctx.close();
  }
}

/** Turn detected ranges into fresh, unnamed `ShadowingSegment`s (defaults inherited from the session). */
export function toShadowingSegments(ranges: SegmentRange[]): ShadowingSegment[] {
  return ranges.map(r => ({
    id: newId(),
    label: null,
    startMs: r.startMs,
    endMs: r.endMs,
    maxReplays: null,
    gapMs: null,
  }));
}

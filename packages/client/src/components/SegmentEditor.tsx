import type { ShadowingSegment } from "@sentence-bank/types";

import { useState } from "react";

import { ArrowDown, ArrowUp, AudioWaveform, Captions, Clock, Download, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBookmarkRecord } from "@/hooks/useBookmarks";
import { shadowingSessionsApi } from "@/lib/api/sessions";
import { decodeAudioFile, detectSegments, toShadowingSegments } from "@/lib/audio-segments";
import { newId } from "@/lib/id";
import { formatTime, parseSectionTime, parseYouTubeId } from "@/lib/time";

/** Parse a seconds string into ms, or null when blank/invalid. */
function secondsToMs(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isNaN(n) || n < 0 ? null : Math.round(n * 1000);
}

/** Parse an optional positive integer field; blank → null (use the session default). */
function optionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/**
 * Editor for a shadowing session's practice segments. Times can be typed (in seconds) or captured from
 * the current playback position; per-segment replay/gap overrides fall back to the session defaults when
 * blank. When a bookmark is associated, its timestamp "Sections" can be imported as segments.
 */
export function SegmentEditor({
  segments,
  onChange,
  getCurrentTimeMs,
  defaultMaxReplays,
  defaultGapMs,
  bookmarkId,
  audioSource,
  videoUrl,
  language,
}: {
  segments: ShadowingSegment[];
  onChange: (segments: ShadowingSegment[]) => void;
  getCurrentTimeMs?: () => number;
  defaultMaxReplays: number;
  defaultGapMs: number;
  bookmarkId: string | null;
  /** Uploaded audio to waveform-analyze: a staged File, or the stored `/audio` URL when editing. */
  audioSource?: File | string | null;
  /** The session's video URL; enables caption-based detection when it's a YouTube link. */
  videoUrl?: string | null;
  /** Session language, used as a caption-track hint. */
  language?: string;
}) {
  const bookmark = useBookmarkRecord(bookmarkId);
  const importable = bookmark.data?.sections ?? [];

  const [busy, setBusy] = useState<null | "audio" | "captions">(null);
  const [detectError, setDetectError] = useState<string | null>(null);
  const canUseCaptions = parseYouTubeId(videoUrl ?? null) !== null;

  /** Waveform-analyze the uploaded audio and append the detected segments. */
  const autoDetectFromAudio = async () => {
    if (!audioSource || busy) return;
    setBusy("audio");
    setDetectError(null);
    try {
      const input = typeof audioSource === "string"
        ? await (await fetch(audioSource)).arrayBuffer()
        : audioSource;
      const detected = toShadowingSegments(detectSegments(await decodeAudioFile(input)));
      if (detected.length === 0) setDetectError("No speech segments were detected in the audio.");
      else onChange([...segments, ...detected]);
    }
    catch (err) {
      setDetectError(err instanceof Error ? err.message : "Could not analyze the audio.");
    }
    finally {
      setBusy(null);
    }
  };

  /** Fetch the video's captions and append them as segments. */
  const detectFromCaptions = async () => {
    if (!videoUrl || busy) return;
    setBusy("captions");
    setDetectError(null);
    try {
      const {
        segments: caps,
      } = await shadowingSessionsApi.fetchCaptionSegments(videoUrl, language);
      const mapped: ShadowingSegment[] = caps.map(c => ({
        id: newId(),
        label: c.label,
        startMs: c.startMs,
        endMs: c.endMs,
        maxReplays: null,
        gapMs: null,
      }));
      if (mapped.length === 0) setDetectError("No captions were found for this video.");
      else onChange([...segments, ...mapped]);
    }
    catch (err) {
      setDetectError(err instanceof Error ? err.message : "Could not fetch captions.");
    }
    finally {
      setBusy(null);
    }
  };

  const patch = (id: string, next: Partial<ShadowingSegment>) =>
    onChange(segments.map(s => (s.id === id
      ? {
        ...s,
        ...next,
      }
      : s)));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= segments.length) return;
    const next = [...segments];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const addSegment = () => {
    const start = getCurrentTimeMs?.() ?? 0;
    onChange([
      ...segments,
      {
        id: newId(),
        label: null,
        startMs: start,
        endMs: start + 3000,
        maxReplays: null,
        gapMs: null,
      },
    ]);
  };

  const importSections = () => {
    const imported: ShadowingSegment[] = importable
      .map((section): ShadowingSegment | null => {
        const startMs = parseSectionTime(section.startValue);
        const endMs = parseSectionTime(section.endValue);
        if (startMs === null || endMs === null) return null;
        return {
          id: newId(),
          label: section.label,
          startMs,
          endMs,
          maxReplays: null,
          gapMs: null,
        };
      })
      .filter((s): s is ShadowingSegment => s !== null);
    if (imported.length > 0) onChange([...segments, ...imported]);
  };

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Segments</Label>
        <div className="flex flex-wrap gap-2">
          {audioSource && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={autoDetectFromAudio}
              title="Split the audio into segments on silent gaps"
            >
              <AudioWaveform className="size-4" />
              {busy === "audio" ? "Analyzing…" : "Auto-detect segments"}
            </Button>
          )}
          {canUseCaptions && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={detectFromCaptions}
              title="Create segments from the video's captions"
            >
              <Captions className="size-4" />
              {busy === "captions" ? "Fetching…" : "Detect from captions"}
            </Button>
          )}
          {bookmarkId && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={importable.length === 0}
              onClick={importSections}
              title={bookmark.isLoading
                ? "Loading sections…"
                : importable.length === 0
                  ? "This bookmark has no timestamp sections"
                  : `Import ${importable.length} section(s)`}
            >
              <Download className="size-4" />
              Import sections
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={addSegment}
          >
            <Plus className="size-4" />
            Add segment
          </Button>
        </div>
      </div>

      {detectError && (
        <p className="text-sm text-destructive">{detectError}</p>
      )}

      {segments.length === 0
        ? <p className="text-sm text-muted-foreground">No segments yet.</p>
        : (
          <ul className="space-y-3">
            {segments.map((seg, index) => (
              <li
                key={seg.id}
                className="space-y-2 rounded-md border p-3"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={seg.label ?? ""}
                    onChange={e => patch(seg.id, {
                      label: e.target.value || null,
                    })}
                    placeholder={`Segment ${index + 1}`}
                    className="flex-1"
                    aria-label="Segment label"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => move(index, 1)}
                    disabled={index === segments.length - 1}
                    aria-label="Move down"
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => onChange(segments.filter(s => s.id !== seg.id))}
                    aria-label="Delete segment"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div
                  className="
                    grid gap-3
                    sm:grid-cols-2
                  "
                >
                  <TimeField
                    label="Start"
                    ms={seg.startMs}
                    onChangeSeconds={v => patch(seg.id, {
                      startMs: secondsToMs(v) ?? seg.startMs,
                    })}
                    onCapture={getCurrentTimeMs
                      ? () => patch(seg.id, {
                        startMs: getCurrentTimeMs(),
                      })
                      : undefined}
                  />
                  <TimeField
                    label="End"
                    ms={seg.endMs}
                    onChangeSeconds={v => patch(seg.id, {
                      endMs: secondsToMs(v) ?? seg.endMs,
                    })}
                    onCapture={getCurrentTimeMs
                      ? () => patch(seg.id, {
                        endMs: getCurrentTimeMs(),
                      })
                      : undefined}
                  />
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Replays (default {defaultMaxReplays})
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={seg.maxReplays ?? ""}
                      onChange={e => patch(seg.id, {
                        maxReplays: optionalInt(e.target.value),
                      })}
                      placeholder={String(defaultMaxReplays)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Gap seconds (default {(defaultGapMs / 1000).toFixed(1)})
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      value={seg.gapMs === null ? "" : seg.gapMs / 1000}
                      onChange={e => patch(seg.id, {
                        gapMs: secondsToMs(e.target.value),
                      })}
                      placeholder={(defaultGapMs / 1000).toFixed(1)}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

function TimeField({
  label,
  ms,
  onChangeSeconds,
  onCapture,
}: {
  label: string;
  ms: number;
  onChangeSeconds: (value: string) => void;
  onCapture?: () => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">
        {label}
        {" "}
        —
        <span className="font-mono">{formatTime(ms)}</span>
      </Label>
      <div className="flex gap-1">
        <Input
          type="number"
          min={0}
          step={0.1}
          value={(ms / 1000).toFixed(1)}
          onChange={e => onChangeSeconds(e.target.value)}
          aria-label={`${label} seconds`}
        />
        {onCapture && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCapture}
            title="Set to current playback time"
          >
            <Clock className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

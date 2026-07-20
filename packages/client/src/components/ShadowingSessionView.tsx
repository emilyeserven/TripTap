import type { PlayerHandle } from "@/lib/player";
import type { ListeningEntry, ShadowingSession } from "@sentence-bank/types";

import { useRef, useState } from "react";

import { ExternalLink, Play, RotateCcw, SkipForward, Square } from "lucide-react";

import { AudioFilePlayer } from "@/components/AudioFilePlayer";
import { KanaEntryToggle } from "@/components/KanaEntryToggle";
import { PinnablePlayer } from "@/components/PinnablePlayer";
import { SessionNotes } from "@/components/SessionNotes";
import { StopwatchPlayer } from "@/components/StopwatchPlayer";
import { TimestampModeToggle } from "@/components/TimestampModeToggle";
import { Button } from "@/components/ui/button";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { useSegmentLoop } from "@/hooks/useSegmentLoop";
import { useUpdateShadowingSession } from "@/hooks/useShadowingSessions";
import { shadowingSessionsApi } from "@/lib/api";
import { formatTime, parseYouTubeId } from "@/lib/time";

/**
 * The interactive shadowing surface: the player plus the auto-looping segment controls and the
 * timestamped note-taker. The loop engine seeks/plays/pauses through the player handle; notes persist to
 * the session on every change.
 */
export function ShadowingSessionView({
  session,
}: {
  session: ShadowingSession;
}) {
  const update = useUpdateShadowingSession();
  const playerRef = useRef<PlayerHandle | null>(null);
  const [entries, setEntries] = useState<ListeningEntry[]>(session.entries ?? []);
  const videoId = parseYouTubeId(session.videoUrl);
  // Uploaded audio takes precedence over a video URL; either counts as a real (seekable) timeline.
  const audioSrc = session.hasAudio ? shadowingSessionsApi.audioUrl(session.id) : null;
  const hasMedia = audioSrc !== null || videoId !== null;
  const segments = session.segments ?? [];

  const loop = useSegmentLoop({
    playerRef,
    segments,
    defaultMaxReplays: session.defaultMaxReplays,
    defaultGapMs: session.defaultGapMs,
  });

  const persist = (next: ListeningEntry[]) => {
    setEntries(next);
    update.mutate({
      id: session.id,
      input: {
        entries: next,
      },
    });
  };

  const currentSeg = segments[loop.currentIndex];
  const currentMax = currentSeg?.maxReplays ?? session.defaultMaxReplays;

  return (
    <div className="space-y-4">
      <PinnablePlayer canPin={hasMedia}>
        {audioSrc
          ? (
            <AudioFilePlayer
              ref={playerRef}
              src={audioSrc}
            />
          )
          : videoId
            ? (
              <YouTubePlayer
                ref={playerRef}
                videoId={videoId}
              />
            )
            : (
              <StopwatchPlayer ref={playerRef} />
            )}
      </PinnablePlayer>

      {session.bookmarkId && session.bookmarkTitle && (
        <p className="text-sm text-muted-foreground">
          From bookmark:
          {" "}
          <span className="font-medium text-foreground">{session.bookmarkTitle}</span>
          {session.bookmarkUrl && (
            <a
              href={session.bookmarkUrl}
              target="_blank"
              rel="noreferrer"
              className="
                ml-2 inline-flex items-center gap-1 text-primary
                hover:underline
              "
            >
              open
              <ExternalLink className="size-3" />
            </a>
          )}
        </p>
      )}

      {session.section && (
        <p className="text-sm text-muted-foreground">
          Section:
          {" "}
          <span className="font-medium text-foreground">{session.section.label}</span>
        </p>
      )}

      <div className="space-y-3 rounded-md border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Segments</h2>
          {segments.length > 0 && (
            <div className="flex items-center gap-2">
              {loop.isRunning
                ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={loop.stop}
                  >
                    <Square className="size-4" />
                    Stop
                  </Button>
                )
                : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={loop.start}
                  >
                    <Play className="size-4" />
                    Start practice
                  </Button>
                )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={loop.restartCurrent}
                disabled={!loop.isRunning}
                aria-label="Restart current segment"
              >
                <RotateCcw className="size-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={loop.skipNext}
                disabled={!loop.isRunning}
                aria-label="Skip to next segment"
              >
                <SkipForward className="size-4" />
              </Button>
            </div>
          )}
        </div>

        {segments.length === 0
          ? (
            <p className="text-sm text-muted-foreground">
              No segments defined. Add some on the edit page.
            </p>
          )
          : (
            <ul className="divide-y rounded-md border">
              {segments.map((seg, index) => {
                const active = loop.isRunning && index === loop.currentIndex;
                return (
                  <li
                    key={seg.id}
                    className={`
                      flex items-center gap-3 p-2
                      ${active
                    ? "bg-primary/10"
                    : ""}
                    `}
                  >
                    <Button
                      type="button"
                      size="sm"
                      variant={active ? "default" : "ghost"}
                      onClick={() => loop.jumpTo(index)}
                      aria-label={`Play segment ${index + 1}`}
                    >
                      <Play className="size-4" />
                    </Button>
                    <span className="flex-1">
                      {seg.label ?? `Segment ${index + 1}`}
                      <span
                        className="ml-2 font-mono text-xs text-muted-foreground"
                      >
                        {formatTime(seg.startMs)} – {formatTime(seg.endMs)}
                      </span>
                    </span>
                    {active && (
                      <span className="shrink-0 text-sm text-muted-foreground">
                        Rep {Math.min(loop.repCount + 1, currentMax)}/{currentMax}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Notes</h2>
        <div className="flex flex-wrap items-center gap-4">
          <KanaEntryToggle />
          <TimestampModeToggle />
        </div>
      </div>

      <SessionNotes
        entries={entries}
        onChange={persist}
        getCurrentTimeMs={() => playerRef.current?.getCurrentTimeMs() ?? 0}
        source={hasMedia ? "video" : "stopwatch"}
      />
    </div>
  );
}

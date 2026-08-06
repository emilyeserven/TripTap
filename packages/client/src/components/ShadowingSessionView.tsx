import type { PlayerHandle } from "@/lib/player";
import type { ListeningEntry, ShadowingSession } from "@sentence-bank/types";

import { useEffect, useRef, useState } from "react";

import { ExternalLink, Play, RotateCcw, SkipForward, Square, Volume2 } from "lucide-react";

import { speak } from "@/components/ai-lesson/speak";
import { AudioFilePlayer } from "@/components/AudioFilePlayer";
import { KanaEntryToggle } from "@/components/KanaEntryToggle";
import { PinnablePlayer } from "@/components/PinnablePlayer";
import { SessionNotes } from "@/components/SessionNotes";
import { StopwatchPlayer } from "@/components/StopwatchPlayer";
import { TimestampModeToggle } from "@/components/TimestampModeToggle";
import { Button } from "@/components/ui/button";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { useMySentences } from "@/hooks/useMySentences";
import { useSegmentLoop } from "@/hooks/useSegmentLoop";
import { useSentences } from "@/hooks/useSentences";
import { useShadowingLists } from "@/hooks/useShadowingLists";
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

  // Loops completed this visit, persisted on top of the total the session arrived with. The baseline
  // is captured once so cache refreshes mid-practice can't double-count; the PATCH always sends the
  // absolute total, debounced so a burst of reps is one write.
  const [loopsDone, setLoopsDone] = useState(0);
  const loopsDoneRef = useRef(0);
  const loopsBaselineRef = useRef(session.completedLoops);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateRef = useRef(update);
  updateRef.current = update;

  const persistLoops = () => {
    flushTimerRef.current = null;
    updateRef.current.mutate({
      id: session.id,
      input: {
        completedLoops: loopsBaselineRef.current + loopsDoneRef.current,
      },
    });
  };

  const onRepComplete = () => {
    loopsDoneRef.current += 1;
    setLoopsDone(loopsDoneRef.current);
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(persistLoops, 2000);
  };

  useEffect(() => () => {
    // Flush a pending count when leaving the page so the last reps aren't lost.
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      persistLoops();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loop = useSegmentLoop({
    playerRef,
    segments,
    defaultMaxReplays: session.defaultMaxReplays,
    defaultGapMs: session.defaultGapMs,
    onRepComplete,
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

      {session.shadowingListId
        ? <ShadowingScript listId={session.shadowingListId} />
        : null}

      <div className="space-y-3 rounded-md border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Segments</h2>
          {segments.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Loops: {loopsDone} this run · {loopsBaselineRef.current + loopsDone} total
              </span>
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

/**
 * The linked shadowing list's sentences as the session's practice script, resolved client-side the
 * same way ShadowingListView does (my-sentences prefer their corrected form; ids that no longer
 * resolve are silently dropped). Rendered only when the session was started from a list.
 */
function ShadowingScript({
  listId,
}: {
  listId: string;
}) {
  const {
    data: lists,
  } = useShadowingLists();
  const list = lists?.find(l => l.id === listId) ?? null;
  const {
    data: sentences,
  } = useSentences();
  const {
    data: mySentences,
  } = useMySentences();

  if (!list) return null;

  const bankById = new Map((sentences ?? []).map(s => [s.id, s] as const));
  const mineById = new Map((mySentences ?? []).map(s => [s.id, s] as const));
  const lines = [
    ...list.sentenceIds.flatMap((id) => {
      const s = bankById.get(id);
      return s
        ? [{
          key: `sentence:${s.id}`,
          text: s.text,
          translation: s.translation,
        }]
        : [];
    }),
    ...list.mySentenceIds.flatMap((id) => {
      const s = mineById.get(id);
      return s
        ? [{
          key: `mySentence:${s.id}`,
          text: s.correction?.trim() ? s.correction : s.text,
          translation: s.translation,
        }]
        : [];
    }),
  ];

  if (lines.length === 0) return null;

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Practice script</h2>
        <span className="text-sm text-muted-foreground">{list.name}</span>
      </div>
      <ol className="space-y-2">
        {lines.map(line => (
          <li
            key={line.key}
            className="flex items-start gap-2"
          >
            <Button
              size="icon"
              variant="ghost"
              className="size-6 shrink-0 translate-y-0.5"
              aria-label="Hear"
              onClick={() => speak(line.text)}
            >
              <Volume2 className="size-4" />
            </Button>
            <div className="min-w-0">
              <p
                className="text-lg font-medium"
                lang="ja"
              >
                {line.text}
              </p>
              {line.translation
                ? <p className="text-sm text-muted-foreground">{line.translation}</p>
                : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

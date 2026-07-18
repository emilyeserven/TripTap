import type { PlayerHandle } from "@/lib/player";
import type { ListeningEntry, ListeningSession } from "@sentence-bank/types";

import { useRef, useState } from "react";

import { ExternalLink } from "lucide-react";

import { KanaEntryToggle } from "@/components/KanaEntryToggle";
import { PinnablePlayer } from "@/components/PinnablePlayer";
import { SessionNotes } from "@/components/SessionNotes";
import { StopwatchPlayer } from "@/components/StopwatchPlayer";
import { TimestampModeToggle } from "@/components/TimestampModeToggle";
import { Button } from "@/components/ui/button";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { useUpdateListeningSession } from "@/hooks/useListeningSessions";
import { sectionRefStartMs } from "@/lib/sections";
import { formatTime, parseYouTubeId } from "@/lib/time";

/**
 * The interactive listen-and-shadow surface: the YouTube player (or stopwatch fallback) plus the
 * timestamped note-taker. Notes persist to the session via the update mutation on every change.
 */
export function ListeningSessionView({
  session,
}: {
  session: ListeningSession;
}) {
  const update = useUpdateListeningSession();
  const playerRef = useRef<PlayerHandle>(null);
  const [entries, setEntries] = useState<ListeningEntry[]>(session.entries ?? []);
  const videoId = parseYouTubeId(session.videoUrl);

  const persist = (next: ListeningEntry[]) => {
    setEntries(next);
    update.mutate({
      id: session.id,
      input: {
        entries: next,
      },
    });
  };

  return (
    <div className="space-y-4">
      <PinnablePlayer canPin={!!videoId}>
        {videoId
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
        <p
          className="
            flex flex-wrap items-center gap-2 text-sm text-muted-foreground
          "
        >
          <span>
            Section:
            {" "}
            <span className="font-medium text-foreground">{session.section.label}</span>
          </span>
          {sectionRefStartMs(session.section) !== null && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => playerRef.current?.seekToMs(sectionRefStartMs(session.section) ?? 0)}
            >
              Jump to {formatTime(sectionRefStartMs(session.section) ?? 0)}
            </Button>
          )}
        </p>
      )}

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
        source={videoId ? "video" : "stopwatch"}
      />
    </div>
  );
}

import type { PlayerHandle } from "@/lib/player";
import type { ShadowingSegment, ShadowingSession } from "@sentence-bank/types";

import { useRef, useState } from "react";

import { BookmarkPicker } from "@/components/BookmarkPicker";
import { SegmentEditor } from "@/components/SegmentEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import {
  useCreateShadowingSession,
  useUpdateShadowingSession,
} from "@/hooks/useShadowingSessions";
import { parseYouTubeId } from "@/lib/time";

/**
 * Create/edit form for a shadowing session. Beyond the usual metadata + bookmark association, it holds
 * the session's replay defaults and the segment list. When a video URL is present a preview player is
 * shown so segment start/end can be captured from the current playback position.
 */
export function ShadowingSessionForm({
  session,
  onSuccess,
  initialBookmark,
}: {
  session?: ShadowingSession;
  onSuccess?: (id: string) => void;
  /** Seed a brand-new session from a bookmark (e.g. from the Find a Resource page); ignored when editing. */
  initialBookmark?: { id: string;
    title: string;
    url: string | null; };
}) {
  const create = useCreateShadowingSession();
  const update = useUpdateShadowingSession();
  const editing = session !== undefined;

  const [title, setTitle] = useState(session?.title ?? "");
  const [language, setLanguage] = useState(session?.language ?? "Japanese");
  const [videoUrl, setVideoUrl] = useState(session?.videoUrl ?? initialBookmark?.url ?? "");
  const [bookmarkId, setBookmarkId] = useState(session?.bookmarkId ?? initialBookmark?.id ?? null);
  const [bookmarkTitle, setBookmarkTitle] = useState(session?.bookmarkTitle ?? initialBookmark?.title ?? null);
  const [bookmarkUrl, setBookmarkUrl] = useState(session?.bookmarkUrl ?? initialBookmark?.url ?? null);
  const [defaultMaxReplays, setDefaultMaxReplays] = useState(session?.defaultMaxReplays ?? 3);
  const [defaultGapMs, setDefaultGapMs] = useState(session?.defaultGapMs ?? 0);
  const [segments, setSegments] = useState<ShadowingSegment[]>(session?.segments ?? []);

  const playerRef = useRef<PlayerHandle>(null);
  const videoId = parseYouTubeId(videoUrl);

  const pending = create.isPending || update.isPending;
  const canSubmit = title.trim().length > 0 && language.trim().length > 0 && !pending;

  const submit = async () => {
    if (!canSubmit) return;
    const input = {
      title: title.trim(),
      language: language.trim(),
      videoUrl: videoUrl.trim() || null,
      bookmarkId,
      bookmarkTitle,
      bookmarkUrl,
      defaultMaxReplays,
      defaultGapMs,
      segments: segments.length > 0 ? segments : null,
      entries: session?.entries ?? null,
    };
    const saved = editing
      ? await update.mutateAsync({
        id: session.id,
        input,
      })
      : await create.mutateAsync(input);
    onSuccess?.(saved.id);
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="ss-title">Title</Label>
        <Input
          id="ss-title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Pronunciation drill — scene 3"
        />
      </div>

      <BookmarkPicker
        selectedBookmarkId={bookmarkId}
        selectedBookmarkTitle={bookmarkTitle}
        onPick={(record) => {
          setBookmarkId(record?.id ?? null);
          setBookmarkTitle(record?.title ?? null);
          setBookmarkUrl(record?.url ?? null);
          if (record?.url) setVideoUrl(record.url);
        }}
      />

      <div className="space-y-1.5">
        <Label htmlFor="ss-video">Video URL</Label>
        <Input
          id="ss-video"
          value={videoUrl}
          onChange={e => setVideoUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
        />
      </div>

      {videoId && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Preview — play/scrub, then capture segment times with the clock button.
          </p>
          <YouTubePlayer
            ref={playerRef}
            videoId={videoId}
          />
        </div>
      )}

      <div
        className="
          grid gap-4
          sm:grid-cols-3
        "
      >
        <div className="space-y-1.5">
          <Label htmlFor="ss-language">Language</Label>
          <Input
            id="ss-language"
            value={language}
            onChange={e => setLanguage(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ss-replays">Default replays</Label>
          <Input
            id="ss-replays"
            type="number"
            min={1}
            value={defaultMaxReplays}
            onChange={e => setDefaultMaxReplays(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ss-gap">Default gap (seconds)</Label>
          <Input
            id="ss-gap"
            type="number"
            min={0}
            step={0.1}
            value={defaultGapMs / 1000}
            onChange={e => setDefaultGapMs(Math.max(0, Math.round((Number(e.target.value) || 0) * 1000)))}
          />
        </div>
      </div>

      <SegmentEditor
        segments={segments}
        onChange={setSegments}
        getCurrentTimeMs={videoId ? () => playerRef.current?.getCurrentTimeMs() ?? 0 : undefined}
        defaultMaxReplays={defaultMaxReplays}
        defaultGapMs={defaultGapMs}
        bookmarkId={bookmarkId}
      />

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={!canSubmit}
        >
          {pending
            ? "Saving…"
            : editing
              ? "Save changes"
              : "Create session"}
        </Button>
      </div>
    </form>
  );
}

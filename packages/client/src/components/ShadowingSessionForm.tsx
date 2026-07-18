import type { PlayerHandle } from "@/lib/player";
import type { BookmarkSectionRef, ShadowingSegment, ShadowingSession } from "@sentence-bank/types";

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
import { sectionRefToSegment } from "@/lib/sections";
import { parseYouTubeId } from "@/lib/time";

/** A bookmark used to seed a brand-new session (e.g. from the Find a Resource page). */
interface SeedBookmark {
  id: string;
  title: string;
  url: string | null;
}

/** The form's initial field values: the session's values when editing, else seeded from the bookmark. */
function initialFormState(session: ShadowingSession | undefined, initialBookmark: SeedBookmark | undefined) {
  return {
    title: session?.title ?? "",
    language: session?.language ?? "Japanese",
    videoUrl: session?.videoUrl ?? initialBookmark?.url ?? "",
    bookmarkId: session?.bookmarkId ?? initialBookmark?.id ?? null,
    bookmarkTitle: session?.bookmarkTitle ?? initialBookmark?.title ?? null,
    bookmarkUrl: session?.bookmarkUrl ?? initialBookmark?.url ?? null,
    section: session?.section ?? null,
    defaultMaxReplays: session?.defaultMaxReplays ?? 3,
    defaultGapMs: session?.defaultGapMs ?? 0,
    segments: session?.segments ?? [],
  };
}

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
  initialBookmark?: SeedBookmark;
}) {
  const create = useCreateShadowingSession();
  const update = useUpdateShadowingSession();
  const editing = session !== undefined;

  const init = initialFormState(session, initialBookmark);
  const [title, setTitle] = useState(init.title);
  const [language, setLanguage] = useState(init.language);
  const [videoUrl, setVideoUrl] = useState(init.videoUrl);
  const [bookmarkId, setBookmarkId] = useState(init.bookmarkId);
  const [bookmarkTitle, setBookmarkTitle] = useState(init.bookmarkTitle);
  const [bookmarkUrl, setBookmarkUrl] = useState(init.bookmarkUrl);
  const [section, setSection] = useState<BookmarkSectionRef | null>(init.section);
  const [defaultMaxReplays, setDefaultMaxReplays] = useState(init.defaultMaxReplays);
  const [defaultGapMs, setDefaultGapMs] = useState(init.defaultGapMs);
  const [segments, setSegments] = useState<ShadowingSegment[]>(init.segments);

  const playerRef = useRef<PlayerHandle>(null);
  const videoId = parseYouTubeId(videoUrl);

  const pending = create.isPending || update.isPending;
  const canSubmit = title.trim().length > 0 && language.trim().length > 0 && !pending;

  // A picked timestamp section can seed a practice segment (complements SegmentEditor's bulk import).
  const addSectionAsSegment = () => {
    if (!section) return;
    const segment = sectionRefToSegment(section);
    if (segment) setSegments(prev => [...prev, segment]);
  };
  const canAddSectionSegment = section?.type === "timestamp" && sectionRefToSegment(section) !== null;

  const submit = async () => {
    if (!canSubmit) return;
    const input = {
      title: title.trim(),
      language: language.trim(),
      videoUrl: videoUrl.trim() || null,
      bookmarkId,
      bookmarkTitle,
      bookmarkUrl,
      section,
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
        enableSections
        selectedSection={section}
        onPickSection={setSection}
      />
      {canAddSectionSegment
        ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSectionAsSegment}
          >
            Add “{section?.label}” as a segment
          </Button>
        )
        : null}

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

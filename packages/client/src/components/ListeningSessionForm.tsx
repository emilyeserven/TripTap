import type { BookmarkSectionRef, ListeningSession, SentenceTermRef } from "@sentence-bank/types";

import { useState } from "react";

import { termCategory } from "../lib/terms";

import { BookmarkPicker } from "@/components/BookmarkPicker";
import { TermPicker } from "@/components/TermPicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateListeningSession,
  useUpdateListeningSession,
} from "@/hooks/useListeningSessions";

/**
 * Create/edit form for a listen-and-shadow session. Passing `session` puts it in edit mode. Choosing a
 * bookmark auto-fills the (still editable) video URL and stores the bookmark's id/title/url for the
 * view's back-link. Notes are captured on the session's own view page, not here.
 */
export function ListeningSessionForm({
  session,
  onSuccess,
  initialBookmark,
}: {
  session?: ListeningSession;
  onSuccess?: (id: string) => void;
  /** Seed a brand-new session from a bookmark (e.g. from the Find a Resource page); ignored when editing. */
  initialBookmark?: { id: string;
    title: string;
    url: string | null; };
}) {
  const create = useCreateListeningSession();
  const update = useUpdateListeningSession();
  const editing = session !== undefined;

  const [title, setTitle] = useState(session?.title ?? "");
  const [language, setLanguage] = useState(session?.language ?? "Japanese");
  const [videoUrl, setVideoUrl] = useState(session?.videoUrl ?? initialBookmark?.url ?? "");
  const [bookmarkId, setBookmarkId] = useState(session?.bookmarkId ?? initialBookmark?.id ?? null);
  const [bookmarkTitle, setBookmarkTitle] = useState(session?.bookmarkTitle ?? initialBookmark?.title ?? null);
  const [bookmarkUrl, setBookmarkUrl] = useState(session?.bookmarkUrl ?? initialBookmark?.url ?? null);
  const [section, setSection] = useState<BookmarkSectionRef | null>(session?.section ?? null);
  const [passive, setPassive] = useState(session?.passive ?? false);
  const [durationMinutes, setDurationMinutes] = useState(String(session?.durationMinutes ?? 0));

  const initialTerms = session?.terms ?? [];
  const [vocabTerms, setVocabTerms] = useState<SentenceTermRef[]>(
    initialTerms.filter(t => termCategory(t) === "vocabulary"),
  );
  const [grammarTerms, setGrammarTerms] = useState<SentenceTermRef[]>(
    initialTerms.filter(t => termCategory(t) === "grammar"),
  );

  const pending = create.isPending || update.isPending;
  const canSubmit = title.trim().length > 0 && language.trim().length > 0 && !pending;

  const submit = async () => {
    if (!canSubmit) return;
    const terms = [...vocabTerms, ...grammarTerms];
    const input = {
      title: title.trim(),
      language: language.trim(),
      videoUrl: videoUrl.trim() || null,
      bookmarkId,
      bookmarkTitle,
      bookmarkUrl,
      section,
      passive,
      durationMinutes: passive ? Math.max(0, Math.trunc(Number(durationMinutes) || 0)) : 0,
      terms: terms.length > 0 ? terms : null,
      // Preserve any notes already captured when editing metadata.
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
        <Label htmlFor="ls-title">Title</Label>
        <Input
          id="ls-title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Terrace House ep. 1 — opening"
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

      <div className="space-y-1.5">
        <Label htmlFor="ls-video">Video URL</Label>
        <Input
          id="ls-video"
          value={videoUrl}
          onChange={e => setVideoUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
        />
        <p className="text-xs text-muted-foreground">
          A YouTube link. Leave blank to use the stopwatch fallback.
        </p>
      </div>

      <div
        className="
          space-y-1.5
          sm:max-w-xs
        "
      >
        <Label htmlFor="ls-language">Language</Label>
        <Input
          id="ls-language"
          value={language}
          onChange={e => setLanguage(e.target.value)}
        />
      </div>

      <div className="space-y-2 rounded-md border p-3">
        <label className="flex items-start gap-2">
          <Checkbox
            checked={passive}
            onCheckedChange={next => setPassive(next === true)}
            aria-label="Passive listening session"
          />
          <span className="space-y-0.5">
            <span className="block text-sm font-medium">Passive listening</span>
            <span className="block text-xs text-muted-foreground">
              Just listening, no note-taking. Earns XP by the minute instead of per note.
            </span>
          </span>
        </label>
        {passive && (
          <div
            className="
              space-y-1.5 pl-6
              sm:max-w-xs
            "
          >
            <Label htmlFor="ls-minutes">Minutes listened</Label>
            <Input
              id="ls-minutes"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={durationMinutes}
              onChange={e => setDurationMinutes(e.target.value)}
            />
          </div>
        )}
      </div>

      <div
        className="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <TermPicker
          category="vocabulary"
          label="Vocabulary tags"
          value={vocabTerms}
          onChange={setVocabTerms}
        />
        <TermPicker
          category="grammar"
          label="Grammar tags"
          value={grammarTerms}
          onChange={setGrammarTerms}
        />
      </div>

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

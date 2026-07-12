import type { ListeningSession, SentenceTermRef } from "@sentence-bank/types";

import { useState } from "react";

import { termCategory } from "../lib/terms";

import { BookmarkPicker } from "@/components/BookmarkPicker";
import { TermPicker } from "@/components/TermPicker";
import { Button } from "@/components/ui/button";
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
}: {
  session?: ListeningSession;
  onSuccess?: (id: string) => void;
}) {
  const create = useCreateListeningSession();
  const update = useUpdateListeningSession();
  const editing = session !== undefined;

  const [title, setTitle] = useState(session?.title ?? "");
  const [language, setLanguage] = useState(session?.language ?? "Japanese");
  const [videoUrl, setVideoUrl] = useState(session?.videoUrl ?? "");
  const [bookmarkId, setBookmarkId] = useState(session?.bookmarkId ?? null);
  const [bookmarkTitle, setBookmarkTitle] = useState(session?.bookmarkTitle ?? null);
  const [bookmarkUrl, setBookmarkUrl] = useState(session?.bookmarkUrl ?? null);

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

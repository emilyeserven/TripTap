import type { BookmarkRecord, SentenceTermCategory } from "@sentence-bank/types";

import { useState } from "react";

import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { useBookmarkRecords, useBookmarksVocabulary } from "@/hooks/useBookmarks";
import { TERM_CATEGORIES } from "@/lib/terms";

/**
 * Two-step bookmark chooser for one channel's configured bookmarks source: pick a child tag, then
 * pick one of the bookmarks tagged with it. Selecting a bookmark calls `onPick` with the full record
 * (so the form can auto-fill a URL/title and keep the bookmark id for a back-link). Picking the blank
 * option clears the association.
 */
export function BookmarkPicker({
  selectedBookmarkId,
  selectedBookmarkTitle,
  onPick,
  category = "listening",
  label = "Bookmark",
}: {
  selectedBookmarkId: string | null;
  selectedBookmarkTitle: string | null;
  onPick: (record: BookmarkRecord | null) => void;
  category?: SentenceTermCategory;
  label?: string;
}) {
  const channelLabel = TERM_CATEGORIES.find(c => c.category === category)?.label ?? category;
  const [tagId, setTagId] = useState("");
  const childTags = useBookmarksVocabulary(category);
  const records = useBookmarkRecords(tagId || null);

  const tagOptions = [
    {
      value: "",
      label: "Select a tag…",
    },
    ...(childTags.data ?? []).map(t => ({
      value: t.id,
      label: t.name,
    })),
  ];

  // Keep the currently-selected bookmark visible even before its tag's records load (e.g. in edit mode).
  const recordOptions = [
    {
      value: "",
      label: "No bookmark",
    },
    ...(selectedBookmarkId && !(records.data ?? []).some(r => r.id === selectedBookmarkId)
      ? [{
        value: selectedBookmarkId,
        label: selectedBookmarkTitle ?? selectedBookmarkId,
      }]
      : []),
    ...(records.data ?? []).map(r => ({
      value: r.id,
      label: r.title,
    })),
  ];

  return (
    <div className="space-y-2 rounded-md border p-4">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">
        Pick a {channelLabel} tag, then a bookmark.
      </p>
      {childTags.isError
        ? (
          <p className="text-sm text-destructive">
            Couldn’t reach the bookmarks host. Configure the {channelLabel} source in Settings and make
            sure this server is on the Tailnet.
          </p>
        )
        : (
          <>
            <Combobox
              value={tagId}
              onChange={setTagId}
              options={tagOptions}
              className="w-full"
              ariaLabel={`${channelLabel} tag`}
              placeholder={childTags.isLoading ? "Loading tags…" : "Select a tag…"}
            />
            <Combobox
              value={selectedBookmarkId ?? ""}
              onChange={(id) => {
                if (!id) {
                  onPick(null);
                  return;
                }
                const record = (records.data ?? []).find(r => r.id === id);
                if (record) onPick(record);
              }}
              options={recordOptions}
              className="w-full"
              ariaLabel="Bookmark"
              placeholder={!tagId
                ? "Pick a tag first…"
                : records.isLoading
                  ? "Loading bookmarks…"
                  : records.isError
                    ? "Couldn’t load bookmarks"
                    : "Select a bookmark…"}
            />
          </>
        )}
    </div>
  );
}

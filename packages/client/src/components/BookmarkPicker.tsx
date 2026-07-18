import type { BookmarkRecord, BookmarkSectionRef, SentenceTermCategory } from "@sentence-bank/types";

import { BookmarkSectionSelect } from "@/components/BookmarkSectionSelect";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { useBookmarkRecord, useBookmarkRecords } from "@/hooks/useBookmarks";
import { TERM_CATEGORIES } from "@/lib/terms";

/**
 * Searchable bookmark chooser for one channel's configured bookmarks source. Selecting a bookmark
 * calls `onPick` with the full record (so the form can auto-fill a URL/title and keep the bookmark id
 * for a back-link). Picking the blank option clears the association.
 *
 * When `enableSections` is set, a chained section picker appears once a bookmark with a Sections tree is
 * selected, letting the caller narrow the reference to a specific section.
 */
export function BookmarkPicker({
  selectedBookmarkId,
  selectedBookmarkTitle,
  onPick,
  category = "resource",
  label = "Bookmark",
  enableSections = false,
  selectedSection = null,
  onPickSection,
}: {
  selectedBookmarkId: string | null;
  selectedBookmarkTitle: string | null;
  onPick: (record: BookmarkRecord | null) => void;
  category?: SentenceTermCategory;
  label?: string;
  enableSections?: boolean;
  selectedSection?: BookmarkSectionRef | null;
  onPickSection?: (ref: BookmarkSectionRef | null) => void;
}) {
  const channelLabel = TERM_CATEGORIES.find(c => c.category === category)?.label ?? category;
  const records = useBookmarkRecords(category);
  // The single-record fetch carries the full Sections tree; only enabled once a bookmark is chosen.
  const record = useBookmarkRecord(enableSections ? selectedBookmarkId : null);
  const sectionTree = record.data?.sectionTree ?? [];

  // Keep the currently-selected bookmark visible even before the list finishes loading (e.g. in edit mode).
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
        Search {channelLabel} bookmarks.
      </p>
      {records.isError
        ? (
          <p className="text-sm text-destructive">
            Couldn’t reach the bookmarks host. Configure the {channelLabel} source in Settings and make
            sure this server is on the Tailnet.
          </p>
        )
        : (
          <Combobox
            value={selectedBookmarkId ?? ""}
            onChange={(id) => {
              // Switching or clearing the bookmark invalidates any section pick.
              if (id !== selectedBookmarkId) onPickSection?.(null);
              if (!id) {
                onPick(null);
                return;
              }
              const picked = (records.data ?? []).find(r => r.id === id);
              if (picked) onPick(picked);
            }}
            options={recordOptions}
            className="w-full"
            ariaLabel="Bookmark"
            placeholder={records.isLoading ? "Loading bookmarks…" : "Select a bookmark…"}
          />
        )}
      {enableSections && selectedBookmarkId && sectionTree.length > 0
        ? (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Section (optional)</Label>
            <BookmarkSectionSelect
              nodes={sectionTree}
              value={selectedSection?.id ?? ""}
              onChange={ref => onPickSection?.(ref)}
              className="w-full max-w-sm"
            />
          </div>
        )
        : null}
    </div>
  );
}

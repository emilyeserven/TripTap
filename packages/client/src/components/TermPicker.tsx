import type { SentenceTermCategory, SentenceTermRef } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";

import { MultiSelect } from "@/components/ui/multi-select";
import { useBookmarksVocabulary, useCreateBookmarkTerm } from "@/hooks/useBookmarks";
import { useBookmarksSettings } from "@/hooks/useSettings";

/** Which configured source backs each channel. */
const SOURCE_KEY: Record<
  SentenceTermCategory,
  "source" | "grammarSource" | "generalSource" | "resourceSource"
> = {
  vocabulary: "source",
  grammar: "grammarSource",
  general: "generalSource",
  resource: "resourceSource",
};

/**
 * Multi-select for tagging a sentence with terms borrowed from one channel's configured bookmarks
 * source (a parent tag's children or a taxonomy's terms). The stored value is a list of
 * {@link SentenceTermRef} with provenance and channel {@link SentenceTermCategory} stamped from the
 * configured source. Typing a value that doesn't exist offers to create it in the bookmarks app (under
 * the source's parent tag/term) and attaches the new term. Already-selected terms always remain visible
 * and removable even if the configured source later changes (or the host is unreachable), so tags are
 * never silently dropped.
 */
export function TermPicker({
  value,
  onChange,
  category = "vocabulary",
  label = "Tags",
}: {
  value: SentenceTermRef[];
  onChange: (terms: SentenceTermRef[]) => void;
  category?: SentenceTermCategory;
  label?: string;
}) {
  const settings = useBookmarksSettings();
  const vocab = useBookmarksVocabulary(category);
  const createTerm = useCreateBookmarkTerm();
  const source = settings.data?.[SOURCE_KEY[category]] ?? null;

  // Options = current source's vocabulary, plus any already-selected terms not in it (so cross-source
  // or stale selections still render as removable badges). Deduped by id, missing-selected first.
  const vocabList = vocab.data ?? [];
  const vocabIds = new Set(vocabList.map(o => o.id));
  const missingSelected = value
    .filter(t => !vocabIds.has(t.id))
    .map(t => ({
      value: t.id,
      label: t.name,
    }));
  const options = [
    ...missingSelected,
    ...vocabList.map(o => ({
      value: o.id,
      label: o.name,
    })),
  ];

  function stamp(id: string, name: string): SentenceTermRef {
    return {
      id,
      name,
      kind: source?.kind ?? "tag",
      sourceId: source?.id ?? "",
      sourceLabel: source?.label ?? "",
      category,
    };
  }

  function handleChange(ids: string[]) {
    onChange(ids.map((id) => {
      const existing = value.find(t => t.id === id);
      if (existing) return existing;
      const opt = vocabList.find(o => o.id === id);
      return stamp(id, opt?.name ?? id);
    }));
  }

  async function handleCreate(name: string) {
    try {
      const created = await createTerm.mutateAsync({
        name,
        category,
      });
      onChange([...value, stamp(created.id, created.name)]);
    }
    catch {
      // Surfaced via createTerm.isError below; the typed value is preserved for a retry.
    }
  }

  return (
    <div>
      <span className="block text-sm font-medium text-foreground">
        {label}
        {value.length > 0 ? ` (${value.length})` : ""}
      </span>
      {!source
        ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Choose a bookmarks tag or taxonomy in
            {" "}
            <Link
              to="/settings"
              className="underline underline-offset-2"
            >
              Settings
            </Link>
            {" "}
            to tag with terms.
          </p>
        )
        : (
          <div className="mt-1">
            <MultiSelect
              value={value.map(t => t.id)}
              onChange={handleChange}
              options={options}
              ariaLabel={label}
              placeholder={`Add from “${source.label}”…`}
              searchPlaceholder="Search or create a term…"
              creatable
              onCreate={name => void handleCreate(name)}
              creating={createTerm.isPending}
              emptyText={vocab.isError
                ? "Bookmarks host unreachable."
                : vocab.isLoading
                  ? "Loading terms…"
                  : "No terms found."}
            />
            {vocab.isError
              ? (
                <p className="mt-1 text-xs text-destructive">
                  Couldn’t reach the bookmarks host — existing tags are still editable.
                </p>
              )
              : null}
            {createTerm.isError
              ? (
                <p className="mt-1 text-xs text-destructive">
                  Couldn’t create the term: {createTerm.error.message}
                </p>
              )
              : null}
          </div>
        )}
    </div>
  );
}

import type { SentenceTermRef } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";

import { MultiSelect } from "@/components/ui/multi-select";
import { useBookmarksVocabulary } from "@/hooks/useBookmarks";
import { useBookmarksSettings } from "@/hooks/useSettings";

/**
 * Multi-select for tagging a sentence with terms borrowed from the configured bookmarks source (a
 * parent tag's children or a taxonomy's terms). The stored value is a list of {@link SentenceTermRef}
 * with provenance stamped from the configured source. Already-selected terms always remain visible
 * and removable even if the configured source later changes (or the host is unreachable), so tags are
 * never silently dropped.
 */
export function TermPicker({
  value,
  onChange,
  label = "Taxonomy tags",
}: {
  value: SentenceTermRef[];
  onChange: (terms: SentenceTermRef[]) => void;
  label?: string;
}) {
  const settings = useBookmarksSettings();
  const vocab = useBookmarksVocabulary();
  const source = settings.data?.source ?? null;

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

  function handleChange(ids: string[]) {
    onChange(ids.map((id) => {
      const existing = value.find(t => t.id === id);
      if (existing) return existing;
      const opt = vocabList.find(o => o.id === id);
      return {
        id,
        name: opt?.name ?? id,
        kind: source?.kind ?? "tag",
        sourceId: source?.id ?? "",
        sourceLabel: source?.label ?? "",
      } satisfies SentenceTermRef;
    }));
  }

  return (
    <div>
      <span className="block text-sm font-medium text-slate-700">
        {label}
        {value.length > 0 ? ` (${value.length})` : ""}
      </span>
      {!source
        ? (
          <p className="mt-1 text-xs text-slate-500">
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
              searchPlaceholder="Search terms…"
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
          </div>
        )}
    </div>
  );
}

import type { ComboboxOption } from "@/components/ui/combobox";
import type { SentenceTermCategory, SentenceTermRef } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";

import { MultiSelect } from "@/components/ui/multi-select";
import { useBookmarksVocabulary, useCreateBookmarkTerm, useGrammarTagTree } from "@/hooks/useBookmarks";
import { useBookmarksSettings } from "@/hooks/useSettings";
import { tagSectionOptions } from "@/lib/tag-sections";

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
 * Multi-select for tagging with terms borrowed from one channel's configured bookmarks source. The
 * stored value is a list of {@link SentenceTermRef} with provenance and channel stamped from the
 * source. The **Grammar** channel offers the whole source tree — subtags included — grouped into
 * sections by parent, so any subtag is one click away; other channels offer the source's direct
 * children. Typing an unknown value offers to create it. Already-selected terms always remain visible
 * and removable even if the source changes or the host is unreachable.
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
  const grammarTree = useGrammarTagTree();
  const createTerm = useCreateBookmarkTerm();
  const source = settings.data?.[SOURCE_KEY[category]] ?? null;
  const isGrammar = category === "grammar";

  // Base options: the whole tree (grammar, sectioned) or the source's direct children (other channels).
  const baseOptions: ComboboxOption[] = isGrammar
    ? tagSectionOptions(grammarTree.nodes, grammarTree.rootId, grammarTree.rootLabel)
    : (vocab.data ?? []).map(o => ({
      value: o.id,
      label: o.name,
    }));

  // Prepend any already-selected terms not in the base list (stale / cross-source picks stay removable).
  const knownIds = new Set(baseOptions.map(o => o.value));
  const options = [
    ...value.filter(t => !knownIds.has(t.id)).map(t => ({
      value: t.id,
      label: t.name,
    })),
    ...baseOptions,
  ];

  const nameById = new Map<string, string>([
    ...value.map(t => [t.id, t.name] as const),
    ...baseOptions.map(o => [o.value, o.label] as const),
  ]);

  const isError = isGrammar ? grammarTree.isError : vocab.isError;
  const isLoading = isGrammar ? grammarTree.isLoading : vocab.isLoading;

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
      return existing ?? stamp(id, nameById.get(id) ?? id);
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
              emptyText={isError
                ? "Bookmarks host unreachable."
                : isLoading
                  ? "Loading terms…"
                  : "No terms found."}
            />
            {isError
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

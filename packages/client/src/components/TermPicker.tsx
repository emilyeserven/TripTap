import type { SentenceTermCategory, SentenceTermRef } from "@sentence-bank/types";

import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";

import { TagTreeSelect } from "@/components/TagTreeSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { useBookmarksVocabulary, useCreateBookmarkTerm, useGrammarTagTree } from "@/hooks/useBookmarks";
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
 * Multi-select for tagging with terms borrowed from one channel's configured bookmarks source (a
 * parent tag's children or a taxonomy's terms). The stored value is a list of {@link SentenceTermRef}
 * with provenance and channel stamped from the source. The Grammar channel is **hierarchical**: it
 * drills into subtags via chained comboboxes (any level can be added). Other channels use a flat
 * multi-select. Already-selected terms always remain visible and removable even if the source changes.
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

  // Drill-down draft (grammar channel only): the currently-picked tag not yet added.
  const [draftId, setDraftId] = useState("");
  const [draftName, setDraftName] = useState("");
  const [newName, setNewName] = useState("");

  const vocabList = vocab.data ?? [];

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

  // Options for the flat channels = current vocabulary + already-selected terms not in it (so stale /
  // cross-source selections still render as removable badges). Deduped by id, missing-selected first.
  const vocabIds = new Set(vocabList.map(o => o.id));
  const flatOptions = [
    ...value.filter(t => !vocabIds.has(t.id)).map(t => ({
      value: t.id,
      label: t.name,
    })),
    ...vocabList.map(o => ({
      value: o.id,
      label: o.name,
    })),
  ];

  function handleFlatChange(ids: string[]) {
    onChange(ids.map((id) => {
      const existing = value.find(t => t.id === id);
      if (existing) return existing;
      const opt = vocabList.find(o => o.id === id);
      return stamp(id, opt?.name ?? id);
    }));
  }

  function addDraft() {
    if (!draftId || value.some(t => t.id === draftId)) return;
    onChange([...value, stamp(draftId, draftName)]);
    setDraftId("");
    setDraftName("");
  }

  async function handleCreate(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const created = await createTerm.mutateAsync({
        name: trimmed,
        category,
      });
      onChange([...value, stamp(created.id, created.name)]);
      setNewName("");
    }
    catch {
      // Surfaced via createTerm.isError below; the typed value is preserved for a retry.
    }
  }

  const header = (
    <span className="block text-sm font-medium text-foreground">
      {label}
      {value.length > 0 ? ` (${value.length})` : ""}
    </span>
  );

  if (!source) {
    return (
      <div>
        {header}
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
      </div>
    );
  }

  // ── Grammar: chained comboboxes drilling into subtags ──
  if (category === "grammar") {
    return (
      <div>
        {header}
        <div className="mt-1 space-y-2">
          {value.length > 0
            ? (
              <div className="flex flex-wrap gap-1.5">
                {value.map(t => (
                  <Badge
                    key={t.id}
                    variant="secondary"
                    className="gap-1"
                  >
                    {t.name}
                    <button
                      type="button"
                      aria-label={`Remove ${t.name}`}
                      onClick={() => onChange(value.filter(x => x.id !== t.id))}
                      className="hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )
            : null}

          {grammarTree.isError
            ? (
              <p className="text-xs text-destructive">
                Couldn’t reach the bookmarks host — existing tags are still editable.
              </p>
            )
            : grammarTree.isLoading
              ? <p className="text-xs text-muted-foreground">Loading grammar tags…</p>
              : (
                <div className="flex flex-wrap items-center gap-2">
                  <TagTreeSelect
                    nodes={grammarTree.nodes}
                    rootId={grammarTree.rootId}
                    value={draftId}
                    onChange={(id, name) => {
                      setDraftId(id);
                      setDraftName(name);
                    }}
                    placeholder={`Add from “${source.label}”…`}
                    ariaLabel={label}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDraft}
                    disabled={!draftId || value.some(t => t.id === draftId)}
                  >
                    Add
                  </Button>
                </div>
              )}

          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleCreate(newName);
                }
              }}
              placeholder="Create a new grammar tag…"
              aria-label="Create a grammar tag"
              className="max-w-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleCreate(newName)}
              disabled={!newName.trim() || createTerm.isPending}
            >
              {createTerm.isPending ? "Creating…" : "Create"}
            </Button>
          </div>
          {createTerm.isError
            ? (
              <p className="text-xs text-destructive">
                Couldn’t create the term: {createTerm.error.message}
              </p>
            )
            : null}
        </div>
      </div>
    );
  }

  // ── Other channels: flat multi-select ──
  return (
    <div>
      {header}
      <div className="mt-1">
        <MultiSelect
          value={value.map(t => t.id)}
          onChange={handleFlatChange}
          options={flatOptions}
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
    </div>
  );
}

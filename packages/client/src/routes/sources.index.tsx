import type { CreateSourceInput, Source } from "@sentence-bank/types";

import { useState } from "react";

import { flattenSourceTree, sourceSubtreeIds } from "@sentence-bank/types";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Pencil, Plus } from "lucide-react";

import { SourceParentSelect } from "@/components/SourceParentSelect";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCaptures } from "@/hooks/useCaptures";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSentences } from "@/hooks/useSentences";
import { useCreateSource, useDeleteSource, useSources, useUpdateSource } from "@/hooks/useSources";

export const Route = createFileRoute("/sources/")({
  component: SourcesPage,
});

const fieldClass = "mt-1";

/** A subtree tally: "3 capture(s)" for a leaf, "3 capture(s) (7 with sub-sources)" for a parent. */
function countLabel({
  direct, total,
}: { direct: number;
  total: number; }, noun: string): string {
  const own = `${direct} ${noun}(s)`;
  return total > direct ? `${own} (${total} with sub-sources)` : own;
}

/** Create/edit form for a source. Emits a normalized {@link CreateSourceInput}. */
function SourceForm({
  initial,
  defaultParentId = null,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
  onDelete,
  deleting,
}: {
  initial?: Source;
  /** Parent preset when creating — set by the "sub-source" button on a row. */
  defaultParentId?: string | null;
  submitLabel: string;
  pending: boolean;
  onSubmit: (input: CreateSourceInput) => void;
  onCancel: () => void;
  /** When editing an existing source, deletes it — Delete lives on the edit surface, not the list row. */
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [parentId, setParentId] = useState<string | null>(initial?.parentId ?? defaultParentId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      type: type.trim() || null,
      author: author.trim() || null,
      url: url.trim() || null,
      notes: notes.trim() || null,
      parentId,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3"
    >
      <div
        className="
          grid gap-3
          sm:grid-cols-2
        "
      >
        <label className="block text-sm font-medium text-slate-700">
          Name
          <Input
            className={fieldClass}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="よつばと！ vol. 1"
            autoFocus
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Type
          <Input
            className={fieldClass}
            value={type}
            onChange={e => setType(e.target.value)}
            placeholder="book, show, article…"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Author
          <Input
            className={fieldClass}
            value={author}
            onChange={e => setAuthor(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          URL
          <Input
            className={fieldClass}
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://app.renshuu.org/text/70231/0"
          />
        </label>
        <SourceParentSelect
          id={initial ? `source-parent-${initial.id}` : "source-parent-new"}
          value={parentId}
          onChange={setParentId}
          selfId={initial?.id}
        />
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Notes
        <Textarea
          className={fieldClass}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
        />
      </label>
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={pending || !name.trim()}
        >
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        {onDelete
          ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto text-destructive"
              disabled={deleting}
              onClick={onDelete}
            >
              Delete
            </Button>
          )
          : null}
      </div>
    </form>
  );
}

function SourcesPage() {
  usePageTitle("Sentence Origins");
  const {
    data: sources, isLoading, error,
  } = useSources();
  const {
    data: sentences,
  } = useSentences({
    kind: "bank",
  });
  const {
    data: captures,
  } = useCaptures();
  const createSource = useCreateSource();
  const updateSource = useUpdateSource();
  const deleteSource = useDeleteSource();

  // `creating` holds the parent the new source will hang off: null for a top-level source, an id
  // when the "sub-source" button on a row started it. `false` means the form is closed.
  const [creating, setCreating] = useState<string | null | false>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const tree = flattenSourceTree(sources ?? []);
  const parentName = (id: string | null) => (sources ?? []).find(s => s.id === id)?.name ?? null;

  /**
   * Direct counts plus what sits under the sub-sources: a magazine holds no captures itself, its
   * pages do, so a bare direct count would read as an empty shelf.
   */
  const countFor = (id: string) => {
    const subtree = sourceSubtreeIds(sources ?? [], id);
    const inSubtree = <T extends { sourceId: string | null }>(rows: T[] | undefined) => {
      const all = (rows ?? []).filter(r => r.sourceId && subtree.has(r.sourceId));
      return {
        direct: all.filter(r => r.sourceId === id).length,
        total: all.length,
      };
    };
    return {
      sentences: inSubtree(sentences),
      captures: inSubtree(captures),
    };
  };

  function remove(source: Source) {
    const children = (sources ?? []).filter(s => s.parentId === source.id).length;
    const childNote = children > 0
      ? ` Its ${children} sub-source(s) move to the top level.`
      : "";
    if (!globalThis.confirm(
      `Delete "${source.name}"? Sentences and captures keep working; their source is cleared.${childNote}`,
    )) {
      return;
    }
    deleteSource.mutate(source.id);
  }

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            The origins your sentences and captures are tagged with. Nest them as deep as the thing
            itself goes — a magazine, one issue, the page a few captures came from.
          </p>
        </div>
        {creating === false
          ? (
            <Button onClick={() => setCreating(null)}>
              <Plus className="size-4" />
              New source
            </Button>
          )
          : null}
      </div>

      {creating !== false
        ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {creating ? `New source in ${parentName(creating) ?? "…"}` : "New source"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SourceForm
                // Remount when the preset parent changes, so the form picks the new default up.
                key={creating ?? "root"}
                defaultParentId={creating}
                submitLabel="Create"
                pending={createSource.isPending}
                onCancel={() => setCreating(false)}
                onSubmit={input =>
                  createSource.mutate(input, {
                    onSuccess: () => setCreating(false),
                  })}
              />
            </CardContent>
          </Card>
        )
        : null}

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {!isLoading && sources && sources.length === 0 && creating === false
        ? <p className="text-muted-foreground">No sentence origins yet.</p>
        : null}

      <div className="space-y-3">
        {tree.map(({
          source, depth,
        }) => {
          const counts = countFor(source.id);
          const isEditing = editingId === source.id;
          return (
            <Card
              key={source.id}
              // Depth as an inline indent: the nesting is unbounded, so no fixed class list fits.
              style={{
                marginLeft: `${depth * 1.5}rem`,
              }}
            >
              <CardContent className="space-y-3 p-4">
                {isEditing
                  ? (
                    <SourceForm
                      initial={source}
                      submitLabel="Save"
                      pending={updateSource.isPending}
                      onCancel={() => setEditingId(null)}
                      onDelete={() => remove(source)}
                      deleting={deleteSource.isPending}
                      onSubmit={input =>
                        updateSource.mutate({
                          id: source.id,
                          input,
                        }, {
                          onSuccess: () => setEditingId(null),
                        })}
                    />
                  )
                  : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to="/sources/$id"
                              params={{
                                id: source.id,
                              }}
                              className="
                                font-medium
                                hover:underline
                              "
                            >
                              {source.name}
                            </Link>
                            {source.type
                              ? <span className="text-xs text-muted-foreground">{source.type}</span>
                              : null}
                          </div>
                          {source.author
                            ? <p className="text-sm text-muted-foreground">{source.author}</p>
                            : null}
                          {source.url
                            ? (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="
                                  inline-flex items-center gap-1 text-sm
                                  text-blue-700
                                  hover:underline
                                "
                              >
                                <ExternalLink className="size-3.5" />
                                {source.url}
                              </a>
                            )
                            : null}
                          {source.notes
                            ? (
                              <p
                                className="
                                  text-sm whitespace-pre-wrap text-foreground
                                "
                              >{source.notes}
                              </p>
                            )
                            : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setCreating(source.id)}
                            title={`Add a source inside ${source.name}`}
                          >
                            <Plus className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId(source.id)}
                            title="Edit source"
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </div>
                      </div>
                      <div
                        className="
                          flex flex-wrap items-center gap-3 text-sm
                          text-muted-foreground
                        "
                      >
                        <Link
                          to="/sentences"
                          search={{
                            source: source.id,
                          }}
                          className="hover:underline"
                        >
                          {countLabel(counts.sentences, "sentence")}
                        </Link>
                        <Link
                          to="/captures"
                          search={{
                            source: source.id,
                          }}
                          className="hover:underline"
                        >
                          {countLabel(counts.captures, "capture")}
                        </Link>
                      </div>
                    </>
                  )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

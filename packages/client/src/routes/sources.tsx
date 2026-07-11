import type { CreateSourceInput, Source } from "@sentence-bank/types";

import { useState } from "react";

import { Link, createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";

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
import { useSentences } from "@/hooks/useSentences";
import { useCreateSource, useDeleteSource, useSources, useUpdateSource } from "@/hooks/useSources";

export const Route = createFileRoute("/sources")({
  component: SourcesPage,
});

const fieldClass = "mt-1";

/** Create/edit form for a source. Emits a normalized {@link CreateSourceInput}. */
function SourceForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Source;
  submitLabel: string;
  pending: boolean;
  onSubmit: (input: CreateSourceInput) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      type: type.trim() || null,
      author: author.trim() || null,
      url: url.trim() || null,
      notes: notes.trim() || null,
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
          />
        </label>
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
      </div>
    </form>
  );
}

function SourcesPage() {
  const {
    data: sources, isLoading, error,
  } = useSources();
  const {
    data: sentences,
  } = useSentences();
  const {
    data: captures,
  } = useCaptures();
  const createSource = useCreateSource();
  const updateSource = useUpdateSource();
  const deleteSource = useDeleteSource();

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const countFor = (id: string) => ({
    sentences: (sentences ?? []).filter(s => s.sourceId === id).length,
    captures: (captures ?? []).filter(c => c.sourceId === id).length,
  });

  function remove(source: Source) {
    if (!globalThis.confirm(
      `Delete "${source.name}"? Sentences and captures keep working; their source is cleared.`,
    )) {
      return;
    }
    deleteSource.mutate(source.id);
  }

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sources</h1>
          <p className="text-sm text-muted-foreground">
            The origins your sentences and captures are tagged with.
          </p>
        </div>
        {!creating
          ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              New source
            </Button>
          )
          : null}
      </div>

      {creating
        ? (
          <Card>
            <CardHeader>
              <CardTitle>New source</CardTitle>
            </CardHeader>
            <CardContent>
              <SourceForm
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
      {!isLoading && sources && sources.length === 0 && !creating
        ? <p className="text-muted-foreground">No sources yet.</p>
        : null}

      <div className="space-y-3">
        {(sources ?? []).map((source) => {
          const counts = countFor(source.id);
          const isEditing = editingId === source.id;
          return (
            <Card key={source.id}>
              <CardContent className="space-y-3 p-4">
                {isEditing
                  ? (
                    <SourceForm
                      initial={source}
                      submitLabel="Save"
                      pending={updateSource.isPending}
                      onCancel={() => setEditingId(null)}
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
                            <h2 className="font-medium">{source.name}</h2>
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
                            onClick={() => setEditingId(source.id)}
                            title="Edit source"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(source)}
                            disabled={deleteSource.isPending}
                            title="Delete source"
                          >
                            <Trash2 className="size-4" />
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
                          {counts.sentences}
                          {" "}
                          sentence(s)
                        </Link>
                        <Link
                          to="/captures"
                          search={{
                            source: source.id,
                          }}
                          className="hover:underline"
                        >
                          {counts.captures}
                          {" "}
                          capture(s)
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

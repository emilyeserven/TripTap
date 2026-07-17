import type {
  GrammarConstruction,
  GrammarNote,
  GrammarRelation,
  GrammarRelationKind,
  GrammarResourceRef,
} from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBookmarkRecords, useBookmarksGrammarVocabulary } from "@/hooks/useBookmarks";
import { useCreateGrammarNote, useGrammarNotes, useUpdateGrammarNote } from "@/hooks/useGrammarNotes";
import { useSentences } from "@/hooks/useSentences";
import { usageLabel } from "@/lib/grammar-notes";

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Create/edit form for a grammar note. One component powers both the new and edit pages — pass a `note`
 * to edit an existing one. `presetTagId`/`presetTagName` pre-select a grammar tag on the new form (used
 * by "Create note" deep-links from the AI-lesson view and related-grammar links).
 */
export function GrammarNoteForm({
  note,
  presetTagId,
  presetTagName,
  onSuccess,
}: {
  note?: GrammarNote;
  presetTagId?: string;
  presetTagName?: string;
  onSuccess?: (id: string) => void;
}) {
  const create = useCreateGrammarNote();
  const update = useUpdateGrammarNote();
  const editing = note !== undefined;

  const grammarTags = useBookmarksGrammarVocabulary();
  const resourceRecords = useBookmarkRecords("resource");
  const sentences = useSentences();
  const existingNotes = useGrammarNotes();

  const [tagId, setTagId] = useState(note?.tagId ?? presetTagId ?? "");
  const [tagName, setTagName] = useState(note?.tagName ?? presetTagName ?? "");
  const [title, setTitle] = useState(note?.title ?? presetTagName ?? "");
  const [nuance, setNuance] = useState(note?.nuance ?? "");
  const [summary, setSummary] = useState(note?.summary ?? "");
  const [constructions, setConstructions] = useState<GrammarConstruction[]>(note?.constructions ?? []);
  const [relations, setRelations] = useState<GrammarRelation[]>(note?.relations ?? []);
  const [resources, setResources] = useState<GrammarResourceRef[]>(note?.resources ?? []);

  const notedTagIds = useMemo(
    () => new Set((existingNotes.data ?? []).map(n => n.tagId)),
    [existingNotes.data],
  );
  const noteByTagId = useMemo(
    () => new Map((existingNotes.data ?? []).map(n => [n.tagId, n] as const)),
    [existingNotes.data],
  );

  // New-note tag picker: grammar tags that don't already have a note.
  const tagOptions = useMemo(
    () =>
      (grammarTags.data ?? [])
        .filter(t => !notedTagIds.has(t.id))
        .map(t => ({
          value: t.id,
          label: t.name,
        })),
    [grammarTags.data, notedTagIds],
  );

  // Relation picker: every grammar tag except this note's own; label with the target's nuance if noted.
  const relationTagOptions = useMemo(
    () =>
      (grammarTags.data ?? [])
        .filter(t => t.id !== tagId)
        .map((t) => {
          const target = noteByTagId.get(t.id);
          return {
            value: t.id,
            label: target ? usageLabel(target) : t.name,
          };
        }),
    [grammarTags.data, noteByTagId, tagId],
  );

  const sentenceOptions = useMemo(
    () =>
      (sentences.data ?? []).map(s => ({
        value: s.id,
        label: s.text,
      })),
    [sentences.data],
  );

  const resourceOptions = useMemo(
    () =>
      (resourceRecords.data ?? []).map(r => ({
        value: r.id,
        label: r.title,
      })),
    [resourceRecords.data],
  );

  const pending = create.isPending || update.isPending;
  const canSubmit = tagId.trim().length > 0 && title.trim().length > 0 && !pending;

  const submit = async () => {
    if (!canSubmit) return;
    const base = {
      tagName: tagName.trim() || title.trim(),
      title: title.trim(),
      nuance: nuance.trim() || null,
      summary: summary.trim() || null,
      constructions,
      relations,
      resources,
    };
    const saved = editing
      ? await update.mutateAsync({
        id: note.id,
        input: base,
      })
      : await create.mutateAsync({
        ...base,
        tagId,
      });
    onSuccess?.(saved.id);
  };

  const setConstruction = (id: string, patch: Partial<GrammarConstruction>) =>
    setConstructions(prev => prev.map(c => (c.id === id
      ? {
        ...c,
        ...patch,
      }
      : c)));

  const setRelation = (index: number, patch: Partial<GrammarRelation>) =>
    setRelations(prev => prev.map((r, i) => (i === index
      ? {
        ...r,
        ...patch,
      }
      : r)));

  const setResource = (id: string, patch: Partial<GrammarResourceRef>) =>
    setResources(prev => prev.map(r => (r.id === id
      ? {
        ...r,
        ...patch,
      }
      : r)));

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {/* Grammar tag (new only) */}
      {editing
        ? (
          <div className="space-y-1.5">
            <Label>Grammar point</Label>
            <p className="text-sm text-muted-foreground">
              {tagName} — from the Grammar source. The tag can’t be changed after creation.
            </p>
          </div>
        )
        : (
          <div className="space-y-1.5">
            <Label htmlFor="grammar-tag">Grammar tag</Label>
            {grammarTags.isLoading
              ? <p className="text-sm text-muted-foreground">Loading grammar tags…</p>
              : grammarTags.error
                ? (
                  <p className="text-sm text-destructive">
                    Couldn’t reach the Grammar source. Configure it in Settings → Bookmarks.
                  </p>
                )
                : tagOptions.length === 0
                  ? (
                    <p className="text-sm text-muted-foreground">
                      No grammar tags left to note. Add tags to the Grammar source in Settings →
                      Bookmarks, or every tag already has a note.
                    </p>
                  )
                  : (
                    <Combobox
                      value={tagId}
                      onChange={(value) => {
                        const picked = (grammarTags.data ?? []).find(t => t.id === value);
                        setTagId(value);
                        setTagName(picked?.name ?? "");
                        if (!title.trim()) setTitle(picked?.name ?? "");
                      }}
                      options={tagOptions}
                      placeholder="Pick a grammar tag…"
                      searchPlaceholder="Search grammar tags…"
                      ariaLabel="Grammar tag"
                      className="w-full max-w-md"
                    />
                  )}
          </div>
        )}

      {/* Title + nuance */}
      <div
        className="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <div className="space-y-1.5">
          <Label htmlFor="grammar-title">Title</Label>
          <Input
            id="grammar-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="は"
          />
          <p className="text-xs text-muted-foreground">
            The form as written. Notes sharing a title are linked as other usages of it.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="grammar-nuance">Nuance</Label>
          <Input
            id="grammar-nuance"
            value={nuance}
            onChange={e => setNuance(e.target.value)}
            placeholder="topic marker"
          />
          <p className="text-xs text-muted-foreground">
            A quick memory-jogging note to tell this usage apart from others written the same way.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-1.5">
        <Label htmlFor="grammar-summary">Summary (optional)</Label>
        <Textarea
          id="grammar-summary"
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="An overview of this grammar point."
          rows={4}
        />
      </div>

      {/* Constructions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Constructions</h3>
            <p className="text-xs text-muted-foreground">
              Possible patterns for this grammar point, each with its own example sentences.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setConstructions(prev => [...prev, {
                id: newId(),
                pattern: "",
                note: null,
                sentenceIds: [],
              }])}
          >
            <Plus className="size-4" />
            Add construction
          </Button>
        </div>
        {constructions.length === 0
          ? <p className="text-sm text-muted-foreground italic">No constructions yet.</p>
          : (
            <ul className="space-y-4">
              {constructions.map(c => (
                <li
                  key={c.id}
                  className="space-y-3 rounded-md border p-3"
                >
                  <div className="flex items-start gap-2">
                    <Input
                      value={c.pattern}
                      onChange={e => setConstruction(c.id, {
                        pattern: e.target.value,
                      })}
                      placeholder="Pattern, e.g. 〜ないといけない"
                      aria-label="Construction pattern"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive"
                      aria-label="Remove construction"
                      onClick={() => setConstructions(prev => prev.filter(x => x.id !== c.id))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={c.note ?? ""}
                    onChange={e => setConstruction(c.id, {
                      note: e.target.value || null,
                    })}
                    placeholder="How this construction works."
                    rows={2}
                    aria-label="Construction note"
                  />
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Example sentences</Label>
                    <MultiSelect
                      value={c.sentenceIds}
                      onChange={ids => setConstruction(c.id, {
                        sentenceIds: ids,
                      })}
                      options={sentenceOptions}
                      placeholder="Link bank sentences…"
                      searchPlaceholder="Search sentences…"
                      emptyText="No sentences."
                      ariaLabel="Link sentences to this construction"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
      </section>

      {/* Related grammar */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Related grammar</h3>
            <p className="text-xs text-muted-foreground">
              Similar or opposite grammar points. Shown on both notes.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={relationTagOptions.length === 0}
            onClick={() =>
              setRelations(prev => [...prev, {
                tagId: "",
                tagName: "",
                kind: "similar",
                note: null,
              }])}
          >
            <Plus className="size-4" />
            Add relation
          </Button>
        </div>
        {relations.length === 0
          ? <p className="text-sm text-muted-foreground italic">No related grammar yet.</p>
          : (
            <ul className="space-y-4">
              {relations.map((r, i) => (
                <li
                  key={i}
                  className="space-y-3 rounded-md border p-3"
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-48 flex-1">
                      <Combobox
                        value={r.tagId}
                        onChange={(value) => {
                          const picked = (grammarTags.data ?? []).find(t => t.id === value);
                          setRelation(i, {
                            tagId: value,
                            tagName: picked?.name ?? "",
                          });
                        }}
                        options={relationTagOptions}
                        placeholder="Pick a grammar point…"
                        searchPlaceholder="Search grammar…"
                        ariaLabel="Related grammar point"
                        className="w-full"
                      />
                    </div>
                    <Select
                      value={r.kind}
                      onValueChange={value => setRelation(i, {
                        kind: value as GrammarRelationKind,
                      })}
                    >
                      <SelectTrigger
                        className="w-36"
                        aria-label="Relation kind"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="similar">Similar</SelectItem>
                        <SelectItem value="antonym">Antonym</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive"
                      aria-label="Remove relation"
                      onClick={() => setRelations(prev => prev.filter((_, x) => x !== i))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <Input
                    value={r.note ?? ""}
                    onChange={e => setRelation(i, {
                      note: e.target.value || null,
                    })}
                    placeholder="How they relate (optional)."
                    aria-label="Relation note"
                  />
                </li>
              ))}
            </ul>
          )}
      </section>

      {/* Resources */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Resources</h3>
            <p className="text-xs text-muted-foreground">
              Videos, textbook pages, and worksheets from the Resources source.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setResources(prev => [...prev, {
                id: newId(),
                title: "",
                url: null,
                note: null,
              }])}
          >
            <Plus className="size-4" />
            Add resource
          </Button>
        </div>
        {resourceRecords.error
          ? (
            <p className="text-sm text-muted-foreground">
              Couldn’t reach the Resources source. Configure it in Settings → Bookmarks.
            </p>
          )
          : null}
        {resources.length === 0
          ? <p className="text-sm text-muted-foreground italic">No resources yet.</p>
          : (
            <ul className="space-y-4">
              {resources.map(r => (
                <li
                  key={r.id}
                  className="space-y-3 rounded-md border p-3"
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-48 flex-1">
                      <Combobox
                        value={resourceOptions.some(o => o.value === r.id) ? r.id : ""}
                        onChange={(value) => {
                          const picked = (resourceRecords.data ?? []).find(x => x.id === value);
                          setResource(r.id, {
                            id: value,
                            title: picked?.title ?? r.title,
                            url: picked?.url ?? null,
                          });
                        }}
                        options={resourceOptions}
                        placeholder={r.title || "Pick a resource…"}
                        searchPlaceholder="Search resources…"
                        ariaLabel="Resource"
                        className="w-full"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive"
                      aria-label="Remove resource"
                      onClick={() => setResources(prev => prev.filter(x => x.id !== r.id))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <Input
                    value={r.note ?? ""}
                    onChange={e => setResource(r.id, {
                      note: e.target.value || null,
                    })}
                    placeholder="Locator, e.g. Genki I p.42 or watch 3:10–4:00 (optional)."
                    aria-label="Resource note"
                  />
                </li>
              ))}
            </ul>
          )}
      </section>

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={!canSubmit}
        >
          {pending
            ? "Saving…"
            : editing
              ? "Save changes"
              : "Create note"}
        </Button>
      </div>
    </form>
  );
}

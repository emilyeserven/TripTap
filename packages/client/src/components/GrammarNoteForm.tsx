import type {
  GrammarConstruction,
  GrammarNote,
  GrammarRelation,
  GrammarResourceRef,
} from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { GrammarConstructionsEditor } from "@/components/GrammarConstructionsEditor";
import { GrammarRelationsEditor } from "@/components/GrammarRelationsEditor";
import { GrammarResourcesEditor } from "@/components/GrammarResourcesEditor";
import { GrammarTagPicker } from "@/components/GrammarTagPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBookmarkRecords, useBookmarksGrammarVocabulary, useGrammarTagTree } from "@/hooks/useBookmarks";
import { useCreateGrammarNote, useGrammarNotes, useUpdateGrammarNote } from "@/hooks/useGrammarNotes";
import { useSentences } from "@/hooks/useSentences";
import { usageLabel } from "@/lib/grammar-notes";

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
  const grammarTree = useGrammarTagTree();
  const resourceRecords = useBookmarkRecords("resource");
  const sentences = useSentences();
  const existingNotes = useGrammarNotes();

  const [tagId, setTagId] = useState(note?.tagId ?? presetTagId ?? "");
  const [tagName, setTagName] = useState(note?.tagName ?? presetTagName ?? "");
  const [title, setTitle] = useState(note?.title ?? presetTagName ?? "");
  // In create mode the title follows the picked grammar tag until the user types into it; in edit
  // mode it's already the user's, so never auto-overwrite.
  const [titleTouched, setTitleTouched] = useState(editing);
  const [nuance, setNuance] = useState(note?.nuance ?? "");
  const [summary, setSummary] = useState(note?.summary ?? "");
  const [constructions, setConstructions] = useState<GrammarConstruction[]>(note?.constructions ?? []);
  const [relations, setRelations] = useState<GrammarRelation[]>(note?.relations ?? []);
  const [resources, setResources] = useState<GrammarResourceRef[]>(note?.resources ?? []);

  const noteByTagId = useMemo(
    () => new Map((existingNotes.data ?? []).map(n => [n.tagId, n] as const)),
    [existingNotes.data],
  );

  // Block creating a second note for a tag that already has one (intermediates stay drillable, so the
  // tree isn't filtered — the guard is on the final selection instead).
  const selectedNote = editing ? null : (tagId ? noteByTagId.get(tagId) ?? null : null);

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

  const tagNameOf = (id: string) => (grammarTags.data ?? []).find(t => t.id === id)?.name ?? "";

  const pending = create.isPending || update.isPending;
  const canSubmit = tagId.trim().length > 0 && title.trim().length > 0 && !pending && !selectedNote;

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

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <GrammarTagPicker
        editing={editing}
        tagName={tagName}
        tagId={tagId}
        tree={grammarTree}
        notedNote={selectedNote}
        onPick={(id, name) => {
          setTagId(id);
          setTagName(name);
          if (!titleTouched) setTitle(name);
        }}
      />

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
            onChange={(e) => {
              setTitle(e.target.value);
              setTitleTouched(true);
            }}
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
        <Label htmlFor="grammar-summary">Summary (optional, Markdown)</Label>
        <Textarea
          id="grammar-summary"
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="An overview of this grammar point. Markdown supported."
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Supports Markdown — headings, lists, bold/italic, links, and code.
        </p>
      </div>

      <GrammarConstructionsEditor
        constructions={constructions}
        onChange={setConstructions}
        sentenceOptions={sentenceOptions}
      />

      <GrammarRelationsEditor
        relations={relations}
        onChange={setRelations}
        relationTagOptions={relationTagOptions}
        tagNameOf={tagNameOf}
      />

      <GrammarResourcesEditor
        resources={resources}
        onChange={setResources}
        resourceOptions={resourceOptions}
        resolveResource={(id) => {
          const picked = (resourceRecords.data ?? []).find(x => x.id === id);
          return picked
            ? {
              title: picked.title,
              url: picked.url,
            }
            : undefined;
        }}
        loadError={Boolean(resourceRecords.error)}
      />

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

import type { GrammarResourceRef } from "@sentence-bank/types";

import { Plus, Trash2 } from "lucide-react";

import { BookmarkSectionSelect } from "@/components/BookmarkSectionSelect";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBookmarkRecord } from "@/hooks/useBookmarks";
import { newId } from "@/lib/id";

/**
 * The extra-resources section of the grammar-note form: one-off/temporary references (a bookmark from
 * the Resources source, or a freeform entry) with an optional locator note. Most resources come
 * automatically from the note's grammar tag (shown on the view), so this is only for ad-hoc extras.
 * The parent owns the array and resolves a picked bookmark's title/url.
 */
export function GrammarResourcesEditor({
  resources,
  onChange,
  resourceOptions,
  resolveResource,
  loadError,
}: {
  resources: GrammarResourceRef[];
  onChange: (resources: GrammarResourceRef[]) => void;
  resourceOptions: { value: string;
    label: string; }[];
  /** The picked bookmark's display fields, or undefined when it can't be resolved. */
  resolveResource: (id: string) => { title: string;
    url: string | null; } | undefined;
  /** True when the Resources source couldn't be reached. */
  loadError: boolean;
}) {
  const patch = (id: string, p: Partial<GrammarResourceRef>) =>
    onChange(resources.map(r => (r.id === id
      ? {
        ...r,
        ...p,
      }
      : r)));

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Extra resources</h3>
          <p className="text-xs text-muted-foreground">
            For one-off or temporary references. Bookmarks tagged with this grammar point already
            appear automatically on the note — only add here what isn’t under the tag.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([...resources, {
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
      {loadError
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
              <ResourceRow
                key={r.id}
                resource={r}
                resourceOptions={resourceOptions}
                resolveResource={resolveResource}
                onPatch={p => patch(r.id, p)}
                onRemove={() => onChange(resources.filter(x => x.id !== r.id))}
              />
            ))}
          </ul>
        )}
    </section>
  );
}

/**
 * One resource row: the bookmark/freeform picker, an optional locator note, and — when the row resolves
 * to a real bookmark with a Sections tree — a chained section picker to narrow the reference.
 */
function ResourceRow({
  resource: r,
  resourceOptions,
  resolveResource,
  onPatch,
  onRemove,
}: {
  resource: GrammarResourceRef;
  resourceOptions: { value: string;
    label: string; }[];
  resolveResource: (id: string) => { title: string;
    url: string | null; } | undefined;
  onPatch: (p: Partial<GrammarResourceRef>) => void;
  onRemove: () => void;
}) {
  const isBookmark = resourceOptions.some(o => o.value === r.id);
  const record = useBookmarkRecord(isBookmark ? r.id : null);
  const sectionTree = record.data?.sectionTree ?? [];

  return (
    <li className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-48 flex-1">
          <Combobox
            value={isBookmark ? r.id : ""}
            onChange={(value) => {
              const picked = resolveResource(value);
              onPatch({
                id: value,
                title: picked?.title ?? r.title,
                url: picked?.url ?? null,
                // A different bookmark invalidates any section pick.
                section: value === r.id ? r.section : null,
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
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      {isBookmark && sectionTree.length > 0
        ? (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Section (optional)</Label>
            <BookmarkSectionSelect
              nodes={sectionTree}
              value={r.section?.id ?? ""}
              onChange={ref => onPatch({
                section: ref,
              })}
              className="w-full max-w-sm"
            />
          </div>
        )
        : null}
      <Input
        value={r.note ?? ""}
        onChange={e => onPatch({
          note: e.target.value || null,
        })}
        placeholder="Locator, e.g. Genki I p.42 or watch 3:10–4:00 (optional)."
        aria-label="Resource note"
      />
    </li>
  );
}

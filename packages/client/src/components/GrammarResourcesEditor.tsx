import type { GrammarResourceRef } from "@sentence-bank/types";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
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
              <li
                key={r.id}
                className="space-y-3 rounded-md border p-3"
              >
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-48 flex-1">
                    <Combobox
                      value={resourceOptions.some(o => o.value === r.id) ? r.id : ""}
                      onChange={(value) => {
                        const picked = resolveResource(value);
                        patch(r.id, {
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
                    onClick={() => onChange(resources.filter(x => x.id !== r.id))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <Input
                  value={r.note ?? ""}
                  onChange={e => patch(r.id, {
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
  );
}

import type { GrammarRelation, GrammarRelationKind } from "@sentence-bank/types";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * The Related-grammar section of the grammar-note form: similar/antonym links to other grammar
 * points. The parent owns the array and resolves a picked tag id to its display name.
 */
export function GrammarRelationsEditor({
  relations,
  onChange,
  relationTagOptions,
  tagNameOf,
}: {
  relations: GrammarRelation[];
  onChange: (relations: GrammarRelation[]) => void;
  relationTagOptions: { value: string;
    label: string; }[];
  /** The raw tag name for an id (relation labels may carry the target note's nuance). */
  tagNameOf: (id: string) => string;
}) {
  const patch = (index: number, p: Partial<GrammarRelation>) =>
    onChange(relations.map((r, i) => (i === index
      ? {
        ...r,
        ...p,
      }
      : r)));

  return (
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
            onChange([...relations, {
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
                      onChange={value => patch(i, {
                        tagId: value,
                        tagName: tagNameOf(value),
                      })}
                      options={relationTagOptions}
                      placeholder="Pick a grammar point…"
                      searchPlaceholder="Search grammar…"
                      ariaLabel="Related grammar point"
                      className="w-full"
                    />
                  </div>
                  <Select
                    value={r.kind}
                    onValueChange={value => patch(i, {
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
                    onClick={() => onChange(relations.filter((_, x) => x !== i))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <Input
                  value={r.note ?? ""}
                  onChange={e => patch(i, {
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
  );
}

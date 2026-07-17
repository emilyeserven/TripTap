import type { GrammarConstruction } from "@sentence-bank/types";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Textarea } from "@/components/ui/textarea";
import { newId } from "@/lib/id";

/**
 * The Constructions section of the grammar-note form: possible patterns for the grammar point, each
 * with a note and linked example sentences. The parent owns the array.
 */
export function GrammarConstructionsEditor({
  constructions,
  onChange,
  sentenceOptions,
}: {
  constructions: GrammarConstruction[];
  onChange: (constructions: GrammarConstruction[]) => void;
  sentenceOptions: { value: string;
    label: string; }[];
}) {
  const patch = (id: string, p: Partial<GrammarConstruction>) =>
    onChange(constructions.map(c => (c.id === id
      ? {
        ...c,
        ...p,
      }
      : c)));

  return (
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
            onChange([...constructions, {
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
                    onChange={e => patch(c.id, {
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
                    onClick={() => onChange(constructions.filter(x => x.id !== c.id))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <Textarea
                  value={c.note ?? ""}
                  onChange={e => patch(c.id, {
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
                    onChange={ids => patch(c.id, {
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
  );
}

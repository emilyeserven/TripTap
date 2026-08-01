import type { ConstructionSlot, GrammarConstruction } from "@sentence-bank/types";

import { Blocks, Plus, Trash2 } from "lucide-react";

import { ConstructionBlocksEditor } from "@/components/ConstructionBlocksEditor";
import { ConstructionNoteEditor } from "@/components/ConstructionNoteEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { derivePattern, emptySlot, hasBlocks, slotToken } from "@/lib/construction-blocks";
import { newId } from "@/lib/id";

/**
 * The Constructions section of the grammar-note form: possible patterns for the grammar point.
 * Example sentences are no longer linked by hand — the note page auto-matches tagged sentences
 * against each construction's literal text. The parent owns the array.
 */
export function GrammarConstructionsEditor({
  constructions,
  onChange,
}: {
  constructions: GrammarConstruction[];
  onChange: (constructions: GrammarConstruction[]) => void;
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
            Possible patterns for this grammar point — example sentences auto-match tagged
            sentences by each construction’s literal text.
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
                  {hasBlocks(c)
                    ? (
                      <p
                        className="
                          min-h-9 flex-1 rounded-md bg-muted px-3 py-2 font-mono
                          text-sm
                        "
                        aria-label="Derived construction pattern"
                      >
                        {c.pattern || (
                          <span className="text-muted-foreground italic">
                            Pattern builds from the blocks below.
                          </span>
                        )}
                      </p>
                    )
                    : (
                      <Input
                        value={c.pattern}
                        onChange={e => patch(c.id, {
                          pattern: e.target.value,
                        })}
                        placeholder="Pattern, e.g. 〜ないといけない"
                        aria-label="Construction pattern"
                      />
                    )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => (hasBlocks(c)
                      ? patch(c.id, {
                        slots: undefined,
                        meaning: null,
                      })
                      : patch(c.id, {
                        slots: [emptySlot()],
                      }))}
                  >
                    <Blocks className="size-4" />
                    {hasBlocks(c) ? "Remove blocks" : "Add blocks"}
                  </Button>
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
                {hasBlocks(c)
                  ? (
                    <>
                      <ConstructionBlocksEditor
                        slots={c.slots ?? []}
                        onChange={(slots: ConstructionSlot[]) => patch(c.id, {
                          slots,
                          pattern: derivePattern(slots),
                        })}
                      />
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Meaning</Label>
                        <Input
                          value={c.meaning ?? ""}
                          onChange={e => patch(c.id, {
                            meaning: e.target.value || null,
                          })}
                          placeholder="A [Noun] who is [Adj/Verb]"
                          aria-label="Construction meaning"
                        />
                        <p className="text-xs text-muted-foreground">
                          Use [brackets] to reference blocks:{" "}
                          {(c.slots ?? [])
                            .map(slotToken)
                            .filter(Boolean)
                            .map(s => `[${s}]`)
                            .join(" ") || "add blocks first"}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          How this construction works
                        </Label>
                        <ConstructionNoteEditor
                          value={c.note}
                          onChange={note => patch(c.id, {
                            note,
                          })}
                          slots={c.slots ?? []}
                        />
                      </div>
                    </>
                  )
                  : (
                    <Textarea
                      value={c.note ?? ""}
                      onChange={e => patch(c.id, {
                        note: e.target.value || null,
                      })}
                      placeholder="How this construction works."
                      rows={2}
                      aria-label="Construction note"
                    />
                  )}
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}

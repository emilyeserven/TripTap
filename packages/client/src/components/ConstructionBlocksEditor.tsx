import type { ConstructionAlternative, ConstructionSlot } from "@sentence-bank/types";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { TermPicker } from "@/components/TermPicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { emptyAlternative, emptySlot } from "@/lib/construction-blocks";

/** Common inflection-form choices; the forms picker also accepts free-typed additions. */
const FORM_PRESETS = [
  "Short",
  "Polite",
  "Te",
  "Ta",
  "Nai",
  "Dictionary",
  "Masu",
  "Potential",
  "Volitional",
];

/**
 * Editor for one construction's block template: ordered slots, each holding interchangeable
 * alternatives (a word class with optional forms and a grammar tag, or literal text). The parent owns
 * the array and derives the flat pattern from it.
 */
export function ConstructionBlocksEditor({
  slots,
  onChange,
}: {
  slots: ConstructionSlot[];
  onChange: (slots: ConstructionSlot[]) => void;
}) {
  const patchSlot = (id: string, p: Partial<ConstructionSlot>) =>
    onChange(slots.map(s => (s.id === id
      ? {
        ...s,
        ...p,
      }
      : s)));

  const moveSlot = (index: number, delta: number) => {
    const next = [...slots];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const patchAlternative = (
    slot: ConstructionSlot,
    id: string,
    p: Partial<ConstructionAlternative>,
  ) =>
    patchSlot(slot.id, {
      alternatives: slot.alternatives.map(a => (a.id === id
        ? {
          ...a,
          ...p,
        }
        : a)),
    });

  return (
    <div className="space-y-3">
      {slots.map((slot, index) => (
        <div
          key={slot.id}
          className="space-y-3 rounded-md border border-dashed p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Block {index + 1}
            </span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Move block up"
                disabled={index === 0}
                onClick={() => moveSlot(index, -1)}
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Move block down"
                disabled={index === slots.length - 1}
                onClick={() => moveSlot(index, 1)}
              >
                <ChevronDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive"
                aria-label="Remove block"
                onClick={() => onChange(slots.filter(s => s.id !== slot.id))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
          <ul className="space-y-3">
            {slot.alternatives.map(alt => (
              <li
                key={alt.id}
                className="space-y-2 rounded-md border p-2"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={alt.label}
                    onChange={e => patchAlternative(slot, alt.id, {
                      label: e.target.value,
                    })}
                    placeholder={alt.literal ? "Literal text, e.g. の" : "Part of speech, e.g. Verb"}
                    aria-label="Alternative label"
                  />
                  <label
                    className="
                      flex shrink-0 items-center gap-1.5 text-xs
                      text-muted-foreground
                    "
                  >
                    <Checkbox
                      checked={alt.literal ?? false}
                      onCheckedChange={checked => patchAlternative(slot, alt.id, checked === true
                        ? {
                          literal: true,
                          forms: [],
                          term: null,
                        }
                        : {
                          literal: false,
                        })}
                      aria-label="Literal text"
                    />
                    Literal
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive"
                    aria-label="Remove alternative"
                    disabled={slot.alternatives.length === 1}
                    onClick={() => patchSlot(slot.id, {
                      alternatives: slot.alternatives.filter(a => a.id !== alt.id),
                    })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                {!alt.literal
                  ? (
                    <div
                      className="
                        grid gap-2
                        sm:grid-cols-2
                      "
                    >
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Forms</Label>
                        <MultiSelect
                          value={alt.forms}
                          onChange={forms => patchAlternative(slot, alt.id, {
                            forms,
                          })}
                          options={[
                            ...FORM_PRESETS,
                            ...alt.forms.filter(f => !FORM_PRESETS.includes(f)),
                          ].map(f => ({
                            value: f,
                            label: f,
                          }))}
                          placeholder="Selectable forms…"
                          searchPlaceholder="Search or add a form…"
                          emptyText="No forms."
                          ariaLabel="Alternative forms"
                          creatable
                          onCreate={form => patchAlternative(slot, alt.id, {
                            forms: [...alt.forms, form],
                          })}
                        />
                      </div>
                      <TermPicker
                        single
                        category="grammar"
                        label="Grammar tag"
                        value={alt.term ? [alt.term] : []}
                        onChange={terms => patchAlternative(slot, alt.id, {
                          term: terms[0] ?? null,
                        })}
                      />
                    </div>
                  )
                  : null}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => patchSlot(slot.id, {
              alternatives: [...slot.alternatives, emptyAlternative()],
            })}
          >
            <Plus className="size-4" />
            Add alternative
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...slots, emptySlot()])}
      >
        <Plus className="size-4" />
        Add block
      </Button>
    </div>
  );
}

import type { QuestionSheetPart } from "@sentence-bank/types";

import { useState } from "react";

import { Plus, Trash2 } from "lucide-react";

import { PartQuickAdd } from "@/components/PartQuickAdd";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { newSheetItemId } from "@/lib/question-sheet-parts";

/**
 * Recursive editor for a question's parts. Each part is a labelled slot that can itself contain
 * sub-parts, nested to any depth — the component renders itself for every part's children. The parent
 * owns the array; this component only bubbles an immutable next-array up through `onChange`.
 *
 * Every level ends with a {@link PartAdder}: expanded on an empty level so the first part is easy to
 * add, then collapsed behind a toggle once the level has parts, keeping deep sheets readable.
 */
export function PartsEditor({
  parts,
  onChange,
  depth = 0,
}: {
  parts: QuestionSheetPart[];
  onChange: (parts: QuestionSheetPart[]) => void;
  depth?: number;
}) {
  function addPart() {
    onChange([...parts, {
      id: newSheetItemId("p"),
      label: "",
    }]);
  }
  function addParts(newParts: QuestionSheetPart[]) {
    if (newParts.length === 0) return;
    onChange([...parts, ...newParts]);
  }
  function updatePart(id: string, patch: Partial<QuestionSheetPart>) {
    onChange(parts.map(p => (p.id === id
      ? {
        ...p,
        ...patch,
      }
      : p)));
  }
  function removePart(id: string) {
    onChange(parts.filter(p => p.id !== id));
  }

  const noun = depth === 0 ? "part" : "sub-part";

  return (
    <div className="space-y-2 pl-4">
      {parts.map(part => (
        <div
          key={part.id}
          className="space-y-2"
        >
          <div className="flex items-center gap-2">
            <Input
              value={part.label}
              onChange={e => updatePart(part.id, {
                label: e.target.value,
              })}
              placeholder={`${depth === 0 ? "Part" : "Sub-part"} label, e.g. (a)`}
              aria-label={depth === 0 ? "Part label" : "Sub-part label"}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive"
              aria-label={`Remove ${noun}`}
              onClick={() => removePart(part.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <PartsEditor
            parts={part.parts ?? []}
            onChange={next => updatePart(part.id, {
              parts: next,
            })}
            depth={depth + 1}
          />
        </div>
      ))}
      <PartAdder
        parts={parts}
        depth={depth}
        noun={noun}
        onAddPart={addPart}
        onAddParts={addParts}
      />
    </div>
  );
}

/**
 * The per-level adder. A question's own parts (depth 0) start with the full {@link PartQuickAdd} inline,
 * matching the original UX. Every other case — a level that already has parts, or any nested sub-part
 * level — collapses the adder behind an "Add {noun}s" toggle, so a filled level and every part's
 * sub-part adder stay compact instead of a wall of boxes. Adding always re-collapses the adder, so the
 * structure stays visible once a level has been filled in (the request: collapse once there are parts).
 */
function PartAdder({
  parts,
  depth,
  noun,
  onAddPart,
  onAddParts,
}: {
  parts: QuestionSheetPart[];
  depth: number;
  noun: string;
  onAddPart: () => void;
  onAddParts: (parts: QuestionSheetPart[]) => void;
}) {
  const [open, setOpen] = useState(false);

  function handleAddPart() {
    onAddPart();
    setOpen(false);
  }
  function handleAddParts(newParts: QuestionSheetPart[]) {
    onAddParts(newParts);
    setOpen(false);
  }

  // Only a question's own, still-empty parts show the adder inline; everything else starts collapsed.
  if (depth === 0 && parts.length === 0) {
    return (
      <PartQuickAdd
        existingCount={0}
        noun={noun}
        onAddPart={handleAddPart}
        onAddParts={handleAddParts}
      />
    );
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="space-y-2"
    >
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
        >
          <Plus className="size-4" />
          {open ? "Hide" : "Add"}
          {" "}
          {noun}
          s
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <PartQuickAdd
          existingCount={parts.length}
          noun={noun}
          onAddPart={handleAddPart}
          onAddParts={handleAddParts}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

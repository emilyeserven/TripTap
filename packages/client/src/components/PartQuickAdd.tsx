import type { PartLabelStyle } from "@/lib/question-sheet-parts";
import type { QuestionSheetPart } from "@sentence-bank/types";

import { useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { newSheetItemId, partLabel } from "@/lib/question-sheet-parts";

/** Cap on how many parts one quick-add action can generate at once. */
const MAX_QUICK_PARTS = 50;

/**
 * Per-question quick-add controls for parts. Offers three ways to add:
 * - a single blank "Add part" (the original behaviour);
 * - a count + label style ("a b c" / "1 2 3" / "i ii iii") that generates that many labelled parts,
 *   continuing the sequence after any {@link existingCount existing parts};
 * - a paste box, one label per line, added verbatim.
 * All added parts are appended, never replacing what's already there.
 */
export function PartQuickAdd({
  existingCount,
  onAddPart,
  onAddParts,
  noun = "part",
}: {
  existingCount: number;
  onAddPart: () => void;
  onAddParts: (parts: QuestionSheetPart[]) => void;
  /** What one item is called in the button/aria labels — "part" at the top level, "sub-part" deeper. */
  noun?: string;
}) {
  const [count, setCount] = useState("");
  const [style, setStyle] = useState<PartLabelStyle>("letter");
  const [paste, setPaste] = useState("");

  /** Generate `count` parts in the chosen style, numbered continuing after the existing parts. */
  function addByCount() {
    const n = Math.floor(Number(count));
    if (!Number.isFinite(n) || n < 1) return;
    const parts = Array.from({
      length: Math.min(n, MAX_QUICK_PARTS),
    }, (_, i) => ({
      id: newSheetItemId("p"),
      label: partLabel(style, existingCount + i),
    }));
    onAddParts(parts);
    setCount("");
  }
  /** Append one part per non-blank pasted line, using each line verbatim as the label. */
  function addByPaste() {
    const labels = paste.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (labels.length === 0) return;
    onAddParts(labels.map(label => ({
      id: newSheetItemId("p"),
      label,
    })));
    setPaste("");
  }

  return (
    <div className="space-y-3 rounded-md border border-dashed p-3">
      <div className="flex flex-wrap items-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddPart}
        >
          <Plus className="size-4" />
          Add
          {" "}
          {noun}
        </Button>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Quick add</Label>
          <div className="flex items-end gap-2">
            <Input
              type="number"
              min={1}
              value={count}
              onChange={e => setCount(e.target.value)}
              placeholder="4"
              aria-label={`Number of ${noun}s to add`}
              className="w-20"
            />
            <Select
              value={style}
              onValueChange={v => setStyle(v as PartLabelStyle)}
            >
              <SelectTrigger
                className="w-28"
                aria-label={`${noun} label style`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="letter">a, b, c</SelectItem>
                <SelectItem value="number">1, 2, 3</SelectItem>
                <SelectItem value="roman">i, ii, iii</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addByCount}
            >
              <Plus className="size-4" />
              Add
              {" "}
              {noun}
              s
            </Button>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          Or paste {noun} labels — one per line
        </Label>
        <div className="flex items-end gap-2">
          <Textarea
            value={paste}
            onChange={e => setPaste(e.target.value)}
            placeholder={"(a)\n(b)\n(c)"}
            rows={2}
            aria-label={`Paste ${noun} labels`}
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addByPaste}
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

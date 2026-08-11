import type { SentenceKind } from "@sentence-bank/types";

import { SENTENCE_KIND_INFO, SENTENCE_KINDS } from "@sentence-bank/types";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Choose what kind of sentence is being added.
 *
 * Every "add a sentence" surface offers the same three kinds in the same order with the same copy,
 * so the choice reads identically whether it's on a Renshuu search, a capture, or a paste box.
 * Since the merge into one table, nothing is dropped whichever kind is picked — the kind only says
 * what the sentence is *for* (and which facets the UI leads with).
 */
export function SentenceKindPicker({
  value,
  onChange,
  options = SENTENCE_KINDS,
  id = "sentence-kind",
}: {
  value: SentenceKind;
  onChange: (next: SentenceKind) => void;
  /** Narrow the offer when a source can only legitimately go one place (see Tatoeba's licence). */
  options?: readonly SentenceKind[];
  id?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Add to</Label>
      <Select
        value={value}
        onValueChange={next => onChange(next as SentenceKind)}
      >
        <SelectTrigger
          id={id}
          className="w-full"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(k => (
            <SelectItem
              key={k}
              value={k}
            >
              {SENTENCE_KIND_INFO[k].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {SENTENCE_KIND_INFO[value].description}
      </p>
    </div>
  );
}

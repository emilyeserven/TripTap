import type { SentenceDestination, SentenceDraft } from "@sentence-bank/types";

import { SENTENCE_DESTINATION_INFO, SENTENCE_DESTINATIONS, draftLosesFields } from "@sentence-bank/types";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Choose where imported sentences land.
 *
 * Every "add a sentence" surface offers the same three destinations in the same order with the same
 * copy, so the choice reads identically whether it's on a Renshuu search, a capture, or a paste box.
 * When the drafts carry something the chosen table has no column for, this says so rather than
 * dropping it silently — see `draftLosesFields`.
 */
export function SentenceDestinationPicker({
  value,
  onChange,
  drafts = [],
  options = SENTENCE_DESTINATIONS,
  id = "sentence-destination",
}: {
  value: SentenceDestination;
  onChange: (next: SentenceDestination) => void;
  /** The drafts about to be sent, used only to warn about fields this destination can't hold. */
  drafts?: SentenceDraft[];
  /** Narrow the offer when a source can only legitimately go one place (see Tatoeba's licence). */
  options?: readonly SentenceDestination[];
  id?: string;
}) {
  // One warning for the whole batch: the drafts from a single entry point carry the same fields.
  const lost = drafts.length > 0 ? draftLosesFields(drafts[0], value) : [];

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Add to</Label>
      <Select
        value={value}
        onValueChange={next => onChange(next as SentenceDestination)}
      >
        <SelectTrigger
          id={id}
          className="w-full"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(d => (
            <SelectItem
              key={d}
              value={d}
            >
              {SENTENCE_DESTINATION_INFO[d].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {SENTENCE_DESTINATION_INFO[value].description}
        {lost.length > 0
          ? ` ${SENTENCE_DESTINATION_INFO[value].label} doesn't store ${lost.join(", ")} — that will be dropped.`
          : ""}
      </p>
    </div>
  );
}

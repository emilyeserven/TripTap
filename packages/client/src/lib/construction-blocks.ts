import type {
  ConstructionAlternative,
  ConstructionSlot,
  GrammarConstruction,
} from "@sentence-bank/types";

import { newId } from "@/lib/id";

/** Normalize a label for placeholder matching (width/case-insensitive). */
function normalizeLabel(label: string): string {
  return label.trim().normalize("NFKC").toLowerCase();
}

/** A blank alternative for the editor. */
export function emptyAlternative(): ConstructionAlternative {
  return {
    id: newId(),
    label: "",
    forms: [],
  };
}

/** A blank slot (with one blank alternative) for the editor. */
export function emptySlot(): ConstructionSlot {
  return {
    id: newId(),
    alternatives: [emptyAlternative()],
  };
}

/** Whether a construction uses the block-based template (vs. a flat hand-typed pattern). */
export function hasBlocks(c: GrammarConstruction): boolean {
  return (c.slots?.length ?? 0) > 0;
}

/** One alternative as pattern text: literal/form-less → bare label, else "Adj(Short, Polite)". */
export function alternativeDisplay(alt: ConstructionAlternative): string {
  const label = alt.label.trim();
  if (!label) return "";
  if (alt.literal || alt.forms.length === 0) return label;
  return `${label}(${alt.forms.join(", ")})`;
}

/** One slot as pattern text: its alternatives joined with "/", e.g. "Adj(Short)/Verb(Short)". */
export function slotDisplay(slot: ConstructionSlot): string {
  return slot.alternatives.map(alternativeDisplay).filter(Boolean).join("/");
}

/** The flat pattern string for a block template, e.g. "Adj(Short)/Verb(Short) + Noun". */
export function derivePattern(slots: ConstructionSlot[]): string {
  return slots.map(slotDisplay).filter(Boolean).join(" + ");
}

/** A piece of a rendered meaning template: plain text, or a placeholder resolved to a slot. */
export type MeaningSegment
  = | { type: "text";
    text: string; }
    | { type: "slot";
      slotId: string;
      placeholder: string; };

/**
 * Split a meaning template ("A [Noun] who is [Adj/Verb]") into segments, resolving each `[X]` to the
 * first slot whose alternative labels joined with "/" equal X, or which has an alternative labeled X.
 * An unmatched placeholder degrades to plain text (brackets stripped) so renames never crash.
 */
export function meaningSegments(meaning: string, slots: ConstructionSlot[]): MeaningSegment[] {
  const findSlot = (token: string): ConstructionSlot | undefined => {
    const key = normalizeLabel(token);
    return (
      slots.find(s =>
        normalizeLabel(s.alternatives.map(a => a.label).join("/")) === key)
      ?? slots.find(s => s.alternatives.some(a => normalizeLabel(a.label) === key))
    );
  };

  const segments: MeaningSegment[] = [];
  const push = (text: string) => {
    if (text) {
      segments.push({
        type: "text",
        text,
      });
    }
  };

  let last = 0;
  for (const match of meaning.matchAll(/\[([^\]]+)\]/g)) {
    push(meaning.slice(last, match.index));
    const token = match[1] ?? "";
    const slot = findSlot(token);
    if (slot) {
      segments.push({
        type: "slot",
        slotId: slot.id,
        placeholder: token,
      });
    }
    else {
      push(token);
    }
    last = match.index + match[0].length;
  }
  push(meaning.slice(last));
  return segments;
}

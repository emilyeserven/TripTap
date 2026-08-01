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

/** The canonical [bracket] token for a slot — its alternative labels joined with "/". */
export function slotToken(slot: ConstructionSlot): string {
  return slot.alternatives.map(a => a.label.trim()).filter(Boolean).join("/");
}

/**
 * Resolve a template `[X]` token to the first slot whose alternative labels joined with "/" equal X,
 * or which has an alternative labeled X (width/case-insensitive).
 */
export function resolveSlotToken(
  token: string,
  slots: ConstructionSlot[],
): ConstructionSlot | undefined {
  const key = normalizeLabel(token);
  return (
    slots.find(s =>
      normalizeLabel(s.alternatives.map(a => a.label).join("/")) === key)
    ?? slots.find(s => s.alternatives.some(a => normalizeLabel(a.label) === key))
  );
}

/**
 * The fixed literal skeleton of a construction: labels of `literal` alternatives (block mode) or the
 * whole pattern (flat mode), NFKC-normalized with `〜`-style tildes and whitespace stripped.
 */
export function constructionLiterals(c: GrammarConstruction): string[] {
  const raw = hasBlocks(c)
    ? (c.slots ?? []).flatMap(s => s.alternatives.filter(a => a.literal).map(a => a.label))
    : [c.pattern];
  return [...new Set(
    raw
      .map(l => l.normalize("NFKC").replace(/[〜～~\s]/g, ""))
      .filter(Boolean),
  )];
}

/**
 * Whether a sentence demonstrates a construction: its text must contain every literal part of the
 * construction. ALL (not ANY) keeps single-character particles like と from matching everything; the
 * candidate pool is already filtered to sentences carrying the note's grammar tag. Constructions with
 * no usable literal text match nothing.
 */
export function matchesConstruction(text: string, c: GrammarConstruction): boolean {
  const literals = constructionLiterals(c);
  if (literals.length === 0) return false;
  const t = text.normalize("NFKC");
  return literals.every(l => t.includes(l));
}

/** A piece of a rendered meaning template: plain text, or a placeholder resolved to a slot. */
export type MeaningSegment
  = | { type: "text";
    text: string; }
    | { type: "slot";
      slotId: string;
      placeholder: string; };

/**
 * Split a meaning template ("A [Noun] who is [Adj/Verb]") into segments, resolving each `[X]` via
 * {@link resolveSlotToken}. An unmatched placeholder degrades to plain text (brackets stripped) so
 * renames never crash.
 */
export function meaningSegments(meaning: string, slots: ConstructionSlot[]): MeaningSegment[] {
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
    const slot = resolveSlotToken(token, slots);
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

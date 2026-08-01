import type { ConstructionAlternative, ConstructionSlot } from "@sentence-bank/types";

import { Fragment, useState } from "react";

import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGrammarNotes } from "@/hooks/useGrammarNotes";
import { meaningSegments } from "@/lib/construction-blocks";
import { notesByTagId } from "@/lib/grammar-notes";

interface SlotSelection {
  altIndex: number;
  /** Index into the active alternative's forms; -1 when it has none. */
  formIndex: number;
}

function activeAlternative(slot: ConstructionSlot, sel: SlotSelection | undefined) {
  return slot.alternatives[sel?.altIndex ?? 0] ?? slot.alternatives[0];
}

function activeForm(alt: ConstructionAlternative | undefined, sel: SlotSelection | undefined) {
  if (!alt || alt.literal || alt.forms.length === 0) return null;
  return alt.forms[sel?.formIndex ?? 0] ?? alt.forms[0] ?? null;
}

/** The chip text for a slot's current selection, e.g. "Adj (Short)". */
function selectionLabel(slot: ConstructionSlot, sel: SlotSelection | undefined): string {
  const alt = activeAlternative(slot, sel);
  if (!alt) return "";
  const form = activeForm(alt, sel);
  return form ? `${alt.label} (${form})` : alt.label;
}

/** "Open ⟨tag⟩" row inside a block popover — GrammarTermBadges navigation for one term. */
function TermLink({
  alt,
}: { alt: ConstructionAlternative }) {
  const {
    data: grammarNotes,
  } = useGrammarNotes();
  if (!alt.term) return null;
  const note = notesByTagId(grammarNotes ?? []).get(alt.term.id);
  return (
    <Link
      className="
        flex items-center gap-1 border-t pt-2 text-sm underline-offset-2
        hover:underline
      "
      {...(note
        ? {
          to: "/grammar-notes/$id",
          params: {
            id: note.id,
          },
        }
        : {
          to: "/grammar-notes/new",
          search: {
            tag: alt.term.id,
            name: alt.term.name,
          },
        })}
    >
      Open
      {" "}
      {alt.term.name}
      <ArrowRight className="size-3.5" />
    </Link>
  );
}

/**
 * Interactive renderer for a block-based construction: each slot is a chip showing its active
 * alternative; tapping a chip opens a popover to switch alternatives, pick a form, and jump to a
 * grammar note via the alternative's tag. The meaning template re-renders with the live selection.
 */
export function ConstructionBlocks({
  slots,
  meaning,
}: {
  slots: ConstructionSlot[];
  meaning?: string | null;
}) {
  const [selections, setSelections] = useState<Record<string, SlotSelection>>({});

  const select = (slotId: string, sel: SlotSelection) =>
    setSelections(prev => ({
      ...prev,
      [slotId]: sel,
    }));

  const chipClass = `
    inline-flex items-center rounded-md border bg-muted px-2 py-0.5 text-sm
    font-medium
  `;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {slots.map((slot, index) => {
          const sel = selections[slot.id];
          const alt = activeAlternative(slot, sel);
          if (!alt) return null;
          const interactive = slot.alternatives.length > 1
            || (!alt.literal && (alt.forms.length > 0 || alt.term != null));
          return (
            <Fragment key={slot.id}>
              {index > 0 ? <span className="text-muted-foreground">+</span> : null}
              {interactive
                ? (
                  <Popover>
                    <PopoverTrigger
                      className={`
                        ${chipClass}
                        cursor-pointer
                        hover:bg-accent
                      `}
                      aria-label={`Block: ${selectionLabel(slot, sel)}`}
                    >
                      {selectionLabel(slot, sel)}
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-56 space-y-2"
                    >
                      {slot.alternatives.length > 1
                        ? (
                          <div className="space-y-1">
                            {slot.alternatives.map((a, altIndex) => (
                              <Button
                                key={a.id}
                                type="button"
                                size="sm"
                                variant={a === alt ? "default" : "ghost"}
                                className="w-full justify-start"
                                aria-pressed={a === alt}
                                onClick={() => select(slot.id, {
                                  altIndex,
                                  formIndex: 0,
                                })}
                              >
                                {a.label}
                              </Button>
                            ))}
                          </div>
                        )
                        : null}
                      {!alt.literal && alt.forms.length > 0
                        ? (
                          <div
                            className="
                              flex flex-wrap overflow-hidden rounded-md border
                            "
                            role="group"
                            aria-label="Form"
                          >
                            {alt.forms.map((form, formIndex) => (
                              <Button
                                key={form}
                                type="button"
                                size="sm"
                                variant={form === activeForm(alt, sel) ? "default" : "ghost"}
                                className="rounded-none"
                                aria-pressed={form === activeForm(alt, sel)}
                                onClick={() => select(slot.id, {
                                  altIndex: sel?.altIndex ?? 0,
                                  formIndex,
                                })}
                              >
                                {form}
                              </Button>
                            ))}
                          </div>
                        )
                        : null}
                      <TermLink alt={alt} />
                    </PopoverContent>
                  </Popover>
                )
                : <span className={chipClass}>{selectionLabel(slot, sel)}</span>}
            </Fragment>
          );
        })}
      </div>
      {meaning
        ? (
          <p className="text-sm text-muted-foreground">
            {meaningSegments(meaning, slots).map((segment, i) => {
              if (segment.type === "text") return <Fragment key={i}>{segment.text}</Fragment>;
              const slot = slots.find(s => s.id === segment.slotId);
              if (!slot) return <Fragment key={i}>{segment.placeholder}</Fragment>;
              return (
                <span
                  key={i}
                  className="
                    rounded-sm bg-accent px-1 font-medium text-accent-foreground
                  "
                >
                  {selectionLabel(slot, selections[segment.slotId])}
                </span>
              );
            })}
          </p>
        )
        : null}
    </div>
  );
}

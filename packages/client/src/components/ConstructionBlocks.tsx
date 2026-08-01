import type { ConstructionAlternative, ConstructionSlot } from "@sentence-bank/types";

import { Fragment, useState } from "react";

import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { useGrammarNotes } from "@/hooks/useGrammarNotes";
import { meaningSegments } from "@/lib/construction-blocks";
import { notesByTagId } from "@/lib/grammar-notes";
import { cn } from "@/lib/utils";

interface SlotSelection {
  altIndex: number;
  formIndex: number;
}

type Selections = Record<string, SlotSelection>;

function activeAlternative(slot: ConstructionSlot, sel: SlotSelection | undefined) {
  return slot.alternatives[sel?.altIndex ?? 0] ?? slot.alternatives[0];
}

function activeForm(alt: ConstructionAlternative | undefined, sel: SlotSelection | undefined) {
  if (!alt || alt.literal || alt.forms.length === 0) return null;
  return alt.forms[sel?.formIndex ?? 0] ?? alt.forms[0] ?? null;
}

/** The display text for a slot's current selection, e.g. "Adj (Short)". */
function selectionLabel(slot: ConstructionSlot, sel: SlotSelection | undefined): string {
  const alt = activeAlternative(slot, sel);
  if (!alt) return "";
  const form = activeForm(alt, sel);
  return form ? `${alt.label} (${form})` : alt.label;
}

/** Per-row arrow link to an alternative's grammar tag — GrammarTermBadges navigation, compact. */
function TermIconLink({
  alt,
}: { alt: ConstructionAlternative }) {
  const {
    data: grammarNotes,
  } = useGrammarNotes();
  if (!alt.term) return null;
  const note = notesByTagId(grammarNotes ?? []).get(alt.term.id);
  return (
    <Link
      aria-label={`Open ${alt.term.name}`}
      title={`Open ${alt.term.name}`}
      className="
        flex items-center border-l px-1.5 text-muted-foreground
        hover:bg-accent hover:text-foreground
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
      <ArrowRight className="size-3.5" />
    </Link>
  );
}

/** A template string ("A [Noun] who is [Adj/Verb]") rendered with live selection-tracking chips. */
function SegmentedTemplate({
  template,
  slots,
  selections,
}: {
  template: string;
  slots: ConstructionSlot[];
  selections: Selections;
}) {
  return meaningSegments(template, slots).map((segment, i) => {
    if (segment.type === "text") return <Fragment key={i}>{segment.text}</Fragment>;
    const slot = slots.find(s => s.id === segment.slotId);
    if (!slot) return <Fragment key={i}>{segment.placeholder}</Fragment>;
    return (
      <span
        key={i}
        className="rounded-sm bg-accent px-1 font-medium text-accent-foreground"
      >
        {selectionLabel(slot, selections[segment.slotId])}
      </span>
    );
  });
}

/**
 * Interactive renderer for a block-based construction: each slot is a stacked box showing ALL its
 * alternatives (nothing hidden behind a popover) — clicking a row makes it the active alternative,
 * the active row exposes its selectable forms, and rows with a grammar tag carry a visible link to
 * the tag's note. The meaning and note templates re-render with the live selection.
 */
export function ConstructionBlocks({
  slots,
  meaning,
  note,
}: {
  slots: ConstructionSlot[];
  meaning?: string | null;
  note?: string | null;
}) {
  const [selections, setSelections] = useState<Selections>({});

  const select = (slotId: string, sel: SlotSelection) =>
    setSelections(prev => ({
      ...prev,
      [slotId]: sel,
    }));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {slots.map((slot, index) => {
          const sel = selections[slot.id];
          if (slot.alternatives.length === 0) return null;
          return (
            <Fragment key={slot.id}>
              {index > 0 ? <span className="text-muted-foreground">+</span> : null}
              <div
                className="
                  flex flex-col overflow-hidden rounded-md border bg-muted
                "
              >
                {slot.alternatives.map((alt, altIndex) => {
                  const active = altIndex === (sel?.altIndex ?? 0);
                  return (
                    <Fragment key={alt.id}>
                      <div
                        className={cn("flex items-stretch", altIndex > 0 && `
                          border-t
                        `)}
                      >
                        <button
                          type="button"
                          aria-pressed={active}
                          className={cn(
                            "flex-1 px-2 py-1 text-left text-sm font-medium",
                            active
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-accent/50",
                            slot.alternatives.length === 1 && "cursor-default",
                          )}
                          onClick={() => select(slot.id, {
                            altIndex,
                            formIndex: 0,
                          })}
                        >
                          {alt.label}
                        </button>
                        <TermIconLink alt={alt} />
                      </div>
                      {active && !alt.literal && alt.forms.length > 0
                        ? (
                          <div
                            className="
                              flex flex-wrap gap-0.5 border-t bg-background/50
                              px-1 py-0.5
                            "
                            role="group"
                            aria-label="Form"
                          >
                            {alt.forms.map((form, formIndex) => {
                              const formActive = formIndex === (sel?.formIndex ?? 0);
                              return (
                                <button
                                  key={form}
                                  type="button"
                                  aria-pressed={formActive}
                                  className={cn(
                                    "rounded-sm px-1.5 py-0.5 text-xs",
                                    formActive
                                      ? "bg-primary text-primary-foreground"
                                      : "hover:bg-accent",
                                  )}
                                  onClick={() => select(slot.id, {
                                    altIndex,
                                    formIndex,
                                  })}
                                >
                                  {form}
                                </button>
                              );
                            })}
                          </div>
                        )
                        : null}
                    </Fragment>
                  );
                })}
              </div>
            </Fragment>
          );
        })}
      </div>
      {meaning
        ? (
          <p className="text-sm text-muted-foreground">
            <SegmentedTemplate
              template={meaning}
              slots={slots}
              selections={selections}
            />
          </p>
        )
        : null}
      {note
        ? (
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            <SegmentedTemplate
              template={note}
              slots={slots}
              selections={selections}
            />
          </p>
        )
        : null}
    </div>
  );
}

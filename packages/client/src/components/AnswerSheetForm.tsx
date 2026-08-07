import type {
  AnswerSheet,
  AnswerSheetEntry,
  QuestionSheet,
} from "@sentence-bank/types";

import { useEffect, useMemo, useRef, useState } from "react";

import { AnswerChoiceGroup } from "@/components/AnswerChoiceGroup";
import { AnswerSheetPartsProgress } from "@/components/AnswerSheetPartsProgress";
import { SectionBadges } from "@/components/SectionBadges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateAnswerSheet } from "@/hooks/useAnswerSheets";
import { useAutosave } from "@/hooks/useAutosave";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";
import {
  answerSheetParts,
  generateAnswerSheetTitle,
  questionSheetPartSlots,
  questionSheetParts,
  questionSheetSlots,
} from "@/lib/answer-sheets";
import { cn } from "@/lib/utils";

/** A blank entry for a slot the user has not filled in yet. */
function emptyEntry(slotId: string): AnswerSheetEntry {
  return {
    slotId,
    value: "",
    correct: null,
    correction: null,
    reasoning: null,
    intendedMeaning: null,
    actualMeaning: null,
    marks: null,
  };
}

/** True once the user has put anything into a slot (an answer, a correction, or a review verdict). */
function isTouched(e: AnswerSheetEntry): boolean {
  return e.value.trim().length > 0
    || e.correct != null
    || Boolean(e.correction?.trim())
    || Boolean(e.reasoning?.trim())
    || Boolean(e.intendedMeaning?.trim())
    || Boolean(e.actualMeaning?.trim())
    || (e.marks?.length ?? 0) > 0;
}

const SAVE_LABEL: Record<string, string> = {
  idle: "",
  saving: "Saving…",
  saved: "All changes saved",
};

/**
 * The Answer Sheet editor — one filled-in attempt at a Question Sheet. The sheet is created up front
 * (minimal question-sheet pick) so it always has an id here; this form then **autosaves** every change
 * (fields flush on blur). Each question is its own block — a direct `<form>` child — so slide mode gives
 * each question its own panel. Only touched slots are saved. Marking correct/wrong happens in the view.
 */
export function AnswerSheetForm({
  answerSheet,
  activePart,
}: {
  answerSheet: AnswerSheet;
  /** A top-level question id to scroll to on open (from a scheduled task's `?part`). */
  activePart?: string | null;
}) {
  const update = useUpdateAnswerSheet();
  const sheets = useQuestionSheets();

  const [title, setTitle] = useState(answerSheet.title ?? "");
  const [date, setDate] = useState(answerSheet.date?.slice(0, 10) ?? "");
  // When first answering, keep each question to just its answer box; the correction/explanation/meaning
  // fields are review-phase clutter, revealed only when the learner opts in.
  const [showDetails, setShowDetails] = useState(false);
  const [hiddenPartIds, setHiddenPartIds] = useState<string[]>(answerSheet.hiddenPartIds ?? []);
  const [entries, setEntries] = useState<Record<string, AnswerSheetEntry>>(() => {
    const seed: Record<string, AnswerSheetEntry> = {};
    for (const e of answerSheet.entries ?? []) seed[e.slotId] = e;
    return seed;
  });

  const selected: QuestionSheet | undefined = (sheets.data ?? [])
    .find(s => s.id === answerSheet.questionSheetId);
  // Every slot (for entry preservation), plus the subset still in play (hidden parts filtered out).
  const slots = selected ? questionSheetSlots(selected) : [];
  const hiddenSet = new Set(hiddenPartIds);
  const hiddenSlotIds = new Set<string>();
  if (selected) {
    for (const part of questionSheetPartSlots(selected)) {
      if (hiddenSet.has(part.id)) for (const id of part.slotIds) hiddenSlotIds.add(id);
    }
  }
  const shownSlots = slots.filter(s => !hiddenSlotIds.has(s.id));
  // A part can be hidden only on a multi-part list sheet (grid layout has a single "grid" part).
  const togglableParts = selected && selected.layout !== "grid" ? questionSheetParts(selected) : [];

  function togglePart(partId: string) {
    setHiddenPartIds(prev =>
      prev.includes(partId) ? prev.filter(id => id !== partId) : [...prev, partId]);
  }

  function getEntry(slotId: string): AnswerSheetEntry {
    return entries[slotId] ?? emptyEntry(slotId);
  }
  function setField<K extends keyof AnswerSheetEntry>(
    slotId: string,
    field: K,
    value: AnswerSheetEntry[K],
  ) {
    setEntries(prev => ({
      ...prev,
      [slotId]: {
        ...(prev[slotId] ?? emptyEntry(slotId)),
        [field]: value,
      },
    }));
  }

  const input = useMemo(() => {
    // Map over every slot (not just the shown ones) so a hidden part's answers are preserved and come
    // back when it's unhidden.
    const touched = slots
      .map(slot => getEntry(slot.id))
      .filter(isTouched)
      .map(e => ({
        ...e,
        correction: e.correction?.trim() || null,
        reasoning: e.reasoning?.trim() || null,
        intendedMeaning: e.intendedMeaning?.trim() || null,
        actualMeaning: e.actualMeaning?.trim() || null,
      }));
    return {
      questionSheetId: answerSheet.questionSheetId,
      title: title.trim() || answerSheet.title,
      date: date ? new Date(date).toISOString() : null,
      entries: touched,
      hiddenPartIds: hiddenPartIds.length > 0 ? hiddenPartIds : null,
    };
    // getEntry closes over `entries`; slots derive from the loaded sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, date, entries, hiddenPartIds, slots.length, answerSheet.questionSheetId, answerSheet.title]);

  const {
    status, flush,
  } = useAutosave(input, i => update.mutateAsync({
    id: answerSheet.id,
    input: i,
  }));

  const isGrid = selected?.layout === "grid" && Boolean(selected.grid);

  // On open from a scheduled task, scroll once to the targeted part's first input.
  const scrolledTo = useRef<string | null>(null);
  useEffect(() => {
    if (!activePart || !selected || scrolledTo.current === activePart) return;
    const part = answerSheetParts(selected, answerSheet).find(p => p.questionId === activePart);
    if (!part?.firstSlotId) return;
    scrolledTo.current = activePart;
    globalThis.document.getElementById(`slot-${part.firstSlotId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activePart, selected, answerSheet]);

  return (
    <form
      className="space-y-6"
      onSubmit={e => e.preventDefault()}
    >
      <div className="flex h-4 items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={showDetails}
            onCheckedChange={v => setShowDetails(v === true)}
          />
          Show correction &amp; notes fields
        </label>
        <span className="text-xs text-muted-foreground">{SAVE_LABEL[status]}</span>
      </div>

      <div className="space-y-1.5">
        <Label>Question sheet</Label>
        <p className="text-sm text-muted-foreground">{selected?.title ?? "Loading…"}</p>
        {selected && selected.sections.length > 0
          ? (
            <div className="flex flex-wrap items-center gap-2">
              <SectionBadges sections={selected.sections} />
            </div>
          )
          : null}
      </div>

      <div
        className="
          grid gap-4
          sm:grid-cols-[1fr_auto]
        "
      >
        <div className="space-y-1.5">
          <Label htmlFor="as-title">Title</Label>
          <div className="flex gap-2">
            <Input
              id="as-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={flush}
              placeholder={selected ? generateAnswerSheetTitle(selected, hiddenPartIds) : "Answer sheet"}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!selected}
              // Regenerate from the sheet name + which parts are in play; the change autosaves.
              onClick={() => selected && setTitle(generateAnswerSheetTitle(selected, hiddenPartIds))}
            >
              Auto
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="as-date">Date</Label>
          <Input
            id="as-date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            onBlur={flush}
            className="sm:w-40"
          />
        </div>
      </div>

      {!selected
        ? <p className="text-sm text-muted-foreground">Loading the question sheet…</p>
        : slots.length === 0
          ? <p className="text-sm text-muted-foreground">This sheet has no questions yet.</p>
          : (
            <>
              <AnswerSheetPartsProgress
                questionSheet={selected}
                answerSheet={{
                  ...answerSheet,
                  entries: Object.values(entries),
                  hiddenPartIds,
                }}
                activePart={activePart}
              />

              {togglableParts.length > 1
                ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Parts to include
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {togglableParts.map((part, i) => {
                        const hidden = hiddenSet.has(part.id);
                        return (
                          <button
                            key={part.id}
                            type="button"
                            onClick={() => togglePart(part.id)}
                            aria-pressed={!hidden}
                            className={cn(
                              `
                                inline-flex items-center gap-1 rounded-full
                                border px-2.5 py-1 text-xs
                                hover:bg-muted
                              `,
                              hidden && `
                                text-muted-foreground line-through opacity-60
                              `,
                            )}
                            title={hidden ? `Include ${part.label}` : `Hide ${part.label}`}
                          >
                            <span className="font-medium">Part {i + 1}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
                : null}

              {isGrid && selected.grid
                ? (
                  <GridAnswers
                    grid={selected.grid}
                    getEntry={getEntry}
                    setField={setField}
                    flush={flush}
                  />
                )
                : null}

              {shownSlots.map(slot => (
                <SlotBlock
                  key={slot.id}
                  anchorId={`slot-${slot.id}`}
                  label={slot.label}
                  choices={slot.choices}
                  entry={getEntry(slot.id)}
                  answerMode={isGrid ? "preview" : "edit"}
                  showDetails={showDetails}
                  onField={(field, value) => setField(slot.id, field, value)}
                  flush={flush}
                />
              ))}
            </>
          )}
    </form>
  );
}

/** One question rendered as a single block (a direct form child → its own slide-mode panel). */
function SlotBlock({
  anchorId,
  label,
  choices,
  entry,
  answerMode,
  showDetails,
  onField,
  flush,
}: {
  /** DOM id for scroll anchoring (a scheduled task's `?part` jumps to the part's first slot). */
  anchorId?: string;
  label: string;
  /** Button-group options when the question has a T/F or multiple-choice answer type; null for free text. */
  choices: string[] | null;
  entry: AnswerSheetEntry;
  answerMode: "edit" | "preview";
  /** Show the review-phase correction/explanation/meaning fields; when false, only the answer shows. */
  showDetails: boolean;
  onField: <K extends keyof AnswerSheetEntry>(field: K, value: AnswerSheetEntry[K]) => void;
  flush: () => void;
}) {
  return (
    <div
      id={anchorId}
      className="space-y-3 rounded-md border p-4"
    >
      {answerMode === "edit"
        ? (
          <div className="space-y-1.5">
            <Label>{label}</Label>
            {choices && choices.length > 0
              ? (
                <AnswerChoiceGroup
                  value={entry.value}
                  choices={choices}
                  ariaLabel={label}
                  // Autosave (debounced on `entries`) persists the pick, like a typed answer would.
                  onSelect={value => onField("value", value)}
                />
              )
              : (
                <Textarea
                  value={entry.value}
                  onChange={e => onField("value", e.target.value)}
                  onBlur={flush}
                  placeholder="Your answer"
                  rows={2}
                  aria-label={label}
                />
              )}
          </div>
        )
        : (
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold">
              {entry.value.trim() || (
                <span
                  className="text-base font-normal text-muted-foreground italic"
                >
                  No answer yet
                </span>
              )}
            </p>
          </div>
        )}

      {showDetails && (
        <>
          <div className="space-y-1.5">
            <Label>Correction</Label>
            <Textarea
              value={entry.correction ?? ""}
              onChange={e => onField("correction", e.target.value)}
              onBlur={flush}
              placeholder="The corrected answer"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Explanation (Markdown)</Label>
            <Textarea
              value={entry.reasoning ?? ""}
              onChange={e => onField("reasoning", e.target.value)}
              onBlur={flush}
              placeholder="Why it was wrong — Markdown & multiple lines supported"
              rows={4}
            />
          </div>
          <div
            className="
              grid gap-4
              sm:grid-cols-2
            "
          >
            <div className="space-y-1.5">
              <Label>Intended meaning</Label>
              <Textarea
                value={entry.intendedMeaning ?? ""}
                onChange={e => onField("intendedMeaning", e.target.value)}
                onBlur={flush}
                placeholder="What you meant to say"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>What it actually says</Label>
              <Textarea
                value={entry.actualMeaning ?? ""}
                onChange={e => onField("actualMeaning", e.target.value)}
                onBlur={flush}
                placeholder="The literal reading of your answer, if different"
                rows={2}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** The grid layout's answers, rendered as a labelled table of inputs (one per row × column). */
function GridAnswers({
  grid,
  getEntry,
  setField,
  flush,
}: {
  grid: NonNullable<QuestionSheet["grid"]>;
  getEntry: (slotId: string) => AnswerSheetEntry;
  setField: (slotId: string, field: "value", value: string) => void;
  flush: () => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border p-2 text-left font-medium" />
            {grid.columns.map((col, i) => (
              <th
                key={i}
                className="border p-2 text-left font-medium"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map(row => (
            <tr key={row.id}>
              <th className="border p-2 text-left font-medium">{row.label}</th>
              {grid.columns.map((col, colIndex) => {
                const slotId = `${row.id}:${colIndex}`;
                return (
                  <td
                    key={colIndex}
                    className="border p-1"
                  >
                    <Input
                      value={getEntry(slotId).value}
                      onChange={e => setField(slotId, "value", e.target.value)}
                      onBlur={flush}
                      aria-label={`${row.label} ${col}`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

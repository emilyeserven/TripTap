import type {
  AnswerSheet,
  AnswerSheetEntry,
  QuestionSheet,
} from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateAnswerSheet } from "@/hooks/useAnswerSheets";
import { useAutosave } from "@/hooks/useAutosave";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";
import { questionSheetSlots } from "@/lib/answer-sheets";

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
}: {
  answerSheet: AnswerSheet;
}) {
  const update = useUpdateAnswerSheet();
  const sheets = useQuestionSheets();

  const [title, setTitle] = useState(answerSheet.title ?? "");
  const [date, setDate] = useState(answerSheet.date?.slice(0, 10) ?? "");
  const [entries, setEntries] = useState<Record<string, AnswerSheetEntry>>(() => {
    const seed: Record<string, AnswerSheetEntry> = {};
    for (const e of answerSheet.entries ?? []) seed[e.slotId] = e;
    return seed;
  });

  const selected: QuestionSheet | undefined = (sheets.data ?? [])
    .find(s => s.id === answerSheet.questionSheetId);
  const slots = selected ? questionSheetSlots(selected) : [];

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
    };
    // getEntry closes over `entries`; slots derive from the loaded sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, date, entries, slots.length, answerSheet.questionSheetId, answerSheet.title]);

  const {
    status, flush,
  } = useAutosave(input, i => update.mutateAsync({
    id: answerSheet.id,
    input: i,
  }));

  const isGrid = selected?.layout === "grid" && Boolean(selected.grid);

  return (
    <form
      className="space-y-6"
      onSubmit={e => e.preventDefault()}
    >
      <div className="flex h-4 items-center justify-end">
        <span className="text-xs text-muted-foreground">{SAVE_LABEL[status]}</span>
      </div>

      <div className="space-y-1.5">
        <Label>Question sheet</Label>
        <p className="text-sm text-muted-foreground">{selected?.title ?? "Loading…"}</p>
      </div>

      <div
        className="
          grid gap-4
          sm:grid-cols-[1fr_auto]
        "
      >
        <div className="space-y-1.5">
          <Label htmlFor="as-title">Title</Label>
          <Input
            id="as-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={flush}
            placeholder={selected ? `${selected.title} — today` : "Answer sheet"}
          />
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

              {slots.map(slot => (
                <SlotBlock
                  key={slot.id}
                  label={slot.label}
                  entry={getEntry(slot.id)}
                  answerMode={isGrid ? "preview" : "edit"}
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
  label,
  entry,
  answerMode,
  onField,
  flush,
}: {
  label: string;
  entry: AnswerSheetEntry;
  answerMode: "edit" | "preview";
  onField: <K extends keyof AnswerSheetEntry>(field: K, value: AnswerSheetEntry[K]) => void;
  flush: () => void;
}) {
  return (
    <div className="space-y-3 rounded-md border p-4">
      {answerMode === "edit"
        ? (
          <div className="space-y-1.5">
            <Label>{label}</Label>
            <Textarea
              value={entry.value}
              onChange={e => onField("value", e.target.value)}
              onBlur={flush}
              placeholder="Your answer"
              rows={2}
              aria-label={label}
            />
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

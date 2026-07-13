import type { AnswerSheet, AnswerSheetEntry, QuestionSheet } from "@sentence-bank/types";

import { useRef, useState } from "react";

import { Link } from "@tanstack/react-router";
import { Check, TriangleAlert, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateAnswerSheet } from "@/hooks/useAnswerSheets";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";
import { questionSheetSlots } from "@/lib/answer-sheets";

function emptyEntry(slotId: string): AnswerSheetEntry {
  return {
    slotId,
    value: "",
    needsCorrection: false,
    correction: null,
    reasoning: null,
    intendedMeaning: null,
    actualMeaning: null,
  };
}

/** True once an entry holds anything worth saving (an answer, a flag, or a correction field). */
function isTouched(e: AnswerSheetEntry): boolean {
  return e.value.trim().length > 0
    || e.needsCorrection
    || Boolean(e.correction?.trim())
    || Boolean(e.reasoning?.trim())
    || Boolean(e.intendedMeaning?.trim())
    || Boolean(e.actualMeaning?.trim());
}

/** True when an entry carries any correction detail worth showing beyond the raw answer. */
function hasCorrectionDetail(e: AnswerSheetEntry): boolean {
  return Boolean(e.correction || e.reasoning || e.intendedMeaning || e.actualMeaning);
}

/**
 * The Answer Sheet view. It is not just read-only: each answered slot exposes on-hover ✓ / ✗ actions —
 * ✓ marks the answer correct, ✗ flags it and opens a modal to record the correction. Changes persist
 * immediately via the update mutation. Grid-layout sheets render as a table; others as a list.
 */
export function AnswerSheetView({
  answerSheet: as,
}: {
  answerSheet: AnswerSheet;
}) {
  const sheets = useQuestionSheets();
  const update = useUpdateAnswerSheet();
  const sheet = (sheets.data ?? []).find(s => s.id === as.questionSheetId);
  const slots = sheet ? questionSheetSlots(sheet) : [];
  const labels = new Map(slots.map(s => [s.id, s.label]));
  const isGrid = sheet?.layout === "grid" && sheet.grid != null;

  const [entries, setEntries] = useState<Record<string, AnswerSheetEntry>>(() => {
    const seed: Record<string, AnswerSheetEntry> = {};
    for (const e of as.entries) seed[e.slotId] = e;
    return seed;
  });
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const [correctingSlotId, setCorrectingSlotId] = useState<string | null>(null);

  function getEntry(slotId: string): AnswerSheetEntry {
    return entries[slotId] ?? emptyEntry(slotId);
  }

  /** Persist a full entries map (ordered by slot) to the server. */
  function persist(map: Record<string, AnswerSheetEntry>) {
    const ordered = slots
      .map(s => map[s.id])
      .filter((e): e is AnswerSheetEntry => Boolean(e))
      .filter(isTouched);
    update.mutate({
      id: as.id,
      input: {
        entries: ordered,
      },
    });
  }

  /** Patch one entry, then set + persist immediately (used by the ✓ / ✗ actions). */
  function commitField(slotId: string, patch: Partial<AnswerSheetEntry>) {
    const next = {
      ...entries,
      [slotId]: {
        ...(entries[slotId] ?? emptyEntry(slotId)),
        ...patch,
      },
    };
    setEntries(next);
    persist(next);
  }

  /** Patch one entry locally without persisting (used while editing inside the modal). */
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

  function markCorrect(slotId: string) {
    commitField(slotId, {
      needsCorrection: false,
    });
  }
  function markWrong(slotId: string) {
    commitField(slotId, {
      needsCorrection: true,
    });
    setCorrectingSlotId(slotId);
  }
  function closeModal() {
    persist(entriesRef.current);
    setCorrectingSlotId(null);
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <p className="text-xl font-semibold">{as.title ?? "Answer sheet"}</p>
          <div
            className="
              mt-1 flex flex-wrap items-center gap-2 text-xs
              text-muted-foreground
            "
          >
            {sheet
              ? (
                <Link
                  to="/question-sheets/$id"
                  params={{
                    id: sheet.id,
                  }}
                  className="hover:text-foreground"
                >
                  From: {sheet.title}
                </Link>
              )
              : <span>From a question sheet</span>}
            <Badge variant="secondary">
              {as.entries.length} {as.entries.length === 1 ? "answer" : "answers"}
            </Badge>
            <span className="text-muted-foreground">Hover an answer to mark it ✓ or ✗.</span>
          </div>
        </div>

        {slots.length === 0
          ? <p className="text-sm text-muted-foreground">No answers recorded.</p>
          : isGrid && sheet?.grid
            ? (
              <GridCorrectableView
                grid={sheet.grid}
                getEntry={getEntry}
                markCorrect={markCorrect}
                markWrong={markWrong}
              />
            )
            : (
              <ListCorrectableView
                slots={slots}
                getEntry={getEntry}
                markCorrect={markCorrect}
                markWrong={markWrong}
              />
            )}
      </CardContent>

      <CorrectionModal
        slotId={correctingSlotId}
        label={correctingSlotId ? labels.get(correctingSlotId) ?? correctingSlotId : ""}
        entry={correctingSlotId ? getEntry(correctingSlotId) : null}
        setField={setField}
        onClose={closeModal}
      />
    </Card>
  );
}

/** Two small ✓ / ✗ buttons revealed on hover of the containing `.group` element. */
function HoverActions({
  slotId,
  markCorrect,
  markWrong,
}: {
  slotId: string;
  markCorrect: (slotId: string) => void;
  markWrong: (slotId: string) => void;
}) {
  return (
    <span
      className="
        flex shrink-0 items-center gap-1 opacity-0 transition-opacity
        group-hover:opacity-100
      "
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6 text-green-600"
        aria-label="Mark correct"
        onClick={() => markCorrect(slotId)}
      >
        <Check className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6 text-destructive"
        aria-label="Mark wrong and add a correction"
        onClick={() => markWrong(slotId)}
      >
        <X className="size-4" />
      </Button>
    </span>
  );
}

/** Grid rendering: a labelled table with per-cell hover actions; flagged cells are highlighted. */
function GridCorrectableView({
  grid,
  getEntry,
  markCorrect,
  markWrong,
}: {
  grid: NonNullable<QuestionSheet["grid"]>;
  getEntry: (slotId: string) => AnswerSheetEntry;
  markCorrect: (slotId: string) => void;
  markWrong: (slotId: string) => void;
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
              {grid.columns.map((_, colIndex) => {
                const slotId = `${row.id}:${colIndex}`;
                const entry = getEntry(slotId);
                return (
                  <td
                    key={colIndex}
                    className={entry.needsCorrection
                      ? "border p-1 text-destructive"
                      : "border p-1"}
                  >
                    <div
                      className="
                        group flex min-h-7 items-center justify-between gap-2
                        px-1
                      "
                    >
                      <span>{entry.value || (
                        <span
                          className="text-muted-foreground"
                        >—
                        </span>
                      )}
                      </span>
                      <HoverActions
                        slotId={slotId}
                        markCorrect={markCorrect}
                        markWrong={markWrong}
                      />
                    </div>
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

/** List rendering: one block per answered slot, with hover actions and inline corrections. */
function ListCorrectableView({
  slots,
  getEntry,
  markCorrect,
  markWrong,
}: {
  slots: { id: string;
    label: string; }[];
  getEntry: (slotId: string) => AnswerSheetEntry;
  markCorrect: (slotId: string) => void;
  markWrong: (slotId: string) => void;
}) {
  const answered = slots.filter((s) => {
    const e = getEntry(s.id);
    return e.value.trim() || e.needsCorrection || hasCorrectionDetail(e);
  });

  if (answered.length === 0) {
    return <p className="text-sm text-muted-foreground">No answers recorded.</p>;
  }

  return (
    <div className="space-y-3">
      {answered.map((slot) => {
        const entry = getEntry(slot.id);
        return (
          <div
            key={slot.id}
            className="group space-y-2 rounded-md border p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{slot.label}</p>
              <div className="flex items-center gap-2">
                {entry.needsCorrection ? <NeedsCorrectionBadge /> : null}
                <HoverActions
                  slotId={slot.id}
                  markCorrect={markCorrect}
                  markWrong={markWrong}
                />
              </div>
            </div>
            <p className="text-base">
              {entry.value || <span className="text-muted-foreground italic">No answer</span>}
            </p>
            <EntryCorrections entry={entry} />
          </div>
        );
      })}
    </div>
  );
}

/** The modal opened by ✗: edit the correction fields for one slot; changes persist on close. */
function CorrectionModal({
  slotId,
  label,
  entry,
  setField,
  onClose,
}: {
  slotId: string | null;
  label: string;
  entry: AnswerSheetEntry | null;
  setField: <K extends keyof AnswerSheetEntry>(
    slotId: string,
    field: K,
    value: AnswerSheetEntry[K],
  ) => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={slotId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Correction</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>

        {slotId && entry
          ? (
            <div className="space-y-4">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Your answer</p>
                <p className="text-lg font-semibold">
                  {entry.value.trim() || (
                    <span
                      className="
                        text-base font-normal text-muted-foreground italic
                      "
                    >
                      No answer
                    </span>
                  )}
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={entry.needsCorrection}
                  onCheckedChange={v => setField(slotId, "needsCorrection", v === true)}
                />
                Needs correction
              </label>
              <div className="space-y-1.5">
                <Label htmlFor="corr-modal">Correction</Label>
                <Textarea
                  id="corr-modal"
                  value={entry.correction ?? ""}
                  onChange={e => setField(slotId, "correction", e.target.value)}
                  placeholder="The corrected answer"
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reason-modal">Explanation</Label>
                <Textarea
                  id="reason-modal"
                  value={entry.reasoning ?? ""}
                  onChange={e => setField(slotId, "reasoning", e.target.value)}
                  placeholder="Why it was wrong"
                  rows={2}
                />
              </div>
              <div
                className="
                  grid gap-4
                  sm:grid-cols-2
                "
              >
                <div className="space-y-1.5">
                  <Label htmlFor="intended-modal">Intended meaning</Label>
                  <Textarea
                    id="intended-modal"
                    value={entry.intendedMeaning ?? ""}
                    onChange={e => setField(slotId, "intendedMeaning", e.target.value)}
                    placeholder="What you meant to say"
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="actual-modal">What it actually says</Label>
                  <Textarea
                    id="actual-modal"
                    value={entry.actualMeaning ?? ""}
                    onChange={e => setField(slotId, "actualMeaning", e.target.value)}
                    placeholder="The literal reading of your answer, if different"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )
          : null}

        <DialogFooter>
          <Button
            type="button"
            onClick={onClose}
          >
            Save correction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NeedsCorrectionBadge() {
  return (
    <Badge
      variant="outline"
      className="gap-1 border-destructive/40 text-destructive"
    >
      <TriangleAlert className="size-3" />
      Needs correction
    </Badge>
  );
}

/** The four correction fields for one entry, each rendered only when present. */
function EntryCorrections({
  entry,
}: {
  entry: AnswerSheetEntry;
}) {
  return (
    <>
      {entry.correction
        ? (
          <div className="space-y-1">
            <Label className="text-sm">Correction</Label>
            <p className="text-sm">{entry.correction}</p>
          </div>
        )
        : null}
      {entry.reasoning
        ? (
          <div className="space-y-1">
            <Label className="text-sm">Explanation</Label>
            <p className="text-sm text-muted-foreground">{entry.reasoning}</p>
          </div>
        )
        : null}
      {entry.intendedMeaning || entry.actualMeaning
        ? (
          <div
            className="
              grid gap-4
              sm:grid-cols-2
            "
          >
            {entry.intendedMeaning
              ? (
                <div className="space-y-1">
                  <Label className="text-sm">Intended meaning</Label>
                  <p className="text-sm text-muted-foreground">{entry.intendedMeaning}</p>
                </div>
              )
              : null}
            {entry.actualMeaning
              ? (
                <div className="space-y-1">
                  <Label className="text-sm">What it actually says</Label>
                  <p className="text-sm text-muted-foreground">{entry.actualMeaning}</p>
                </div>
              )
              : null}
          </div>
        )
        : null}
    </>
  );
}

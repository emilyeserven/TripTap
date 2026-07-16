import type {
  AnswerSheet,
  AnswerSheetEntry,
  QuestionSheet,
  QuestionSheetQuestion,
} from "@sentence-bank/types";

import { useRef, useState } from "react";

import { Link } from "@tanstack/react-router";
import { CalendarCheck, Check, Eye, EyeOff, X } from "lucide-react";

import { LearningAreaBadges } from "@/components/LearningAreaBadges";
import { Markdown } from "@/components/Markdown";
import { SentenceCorrector } from "@/components/SentenceCorrector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { answerSheetMeetsDueDate, questionSheetSlots } from "@/lib/answer-sheets";
import { formatDueDate } from "@/lib/due-date";
import { CorrectionDiff } from "@/lib/sentenceDiff";
import { cn } from "@/lib/utils";

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

/** True once an entry holds anything worth saving (an answer, a review verdict, or a correction field). */
function isTouched(e: AnswerSheetEntry): boolean {
  return e.value.trim().length > 0
    || e.correct != null
    || Boolean(e.correction?.trim())
    || Boolean(e.reasoning?.trim())
    || Boolean(e.intendedMeaning?.trim())
    || Boolean(e.actualMeaning?.trim())
    || (e.marks?.length ?? 0) > 0;
}

/** True when an entry carries any correction detail worth showing beyond the raw answer. */
function hasCorrectionDetail(e: AnswerSheetEntry): boolean {
  return Boolean(e.correction || e.reasoning || e.intendedMeaning || e.actualMeaning);
}

/** True once a slot has been engaged with — an answer, a verdict, or a correction. */
function isAnswered(e: AnswerSheetEntry): boolean {
  return e.value.trim().length > 0 || e.correct != null || hasCorrectionDetail(e);
}

/** Persist an inline correction built from span marks + typed insertions for one slot. */
type SaveCorrection = (
  slotId: string,
  result: { correction: string;
    marks: AnswerSheetEntry["marks"];
    reasoning: string | null; },
) => void;

/**
 * The Answer Sheet view. It is not just read-only: each answered slot exposes on-hover ✓ / ✗ actions —
 * ✓ marks the answer correct (the check then stays visible), ✗ opens a modal to record the correction.
 * Corrected answers lead with the fix; the original is tucked behind a toggle. Changes persist
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
      correct: true,
    });
  }
  function markWrong(slotId: string) {
    commitField(slotId, {
      correct: false,
    });
    setCorrectingSlotId(slotId);
  }
  /** Re-open the correction modal for a slot that already has corrections, without changing its verdict. */
  function editCorrections(slotId: string) {
    setCorrectingSlotId(slotId);
  }
  /** Commit an inline correction (built from span marks + typed insertions) for a slot. */
  function saveCorrection(
    slotId: string,
    {
      correction, marks, reasoning,
    }: { correction: string;
      marks: AnswerSheetEntry["marks"];
      reasoning: string | null; },
  ) {
    commitField(slotId, {
      correction,
      marks,
      reasoning,
      correct: false,
    });
  }
  function closeModal() {
    persist(entriesRef.current);
    setCorrectingSlotId(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xl font-semibold">{as.title ?? "Answer sheet"}</p>
        <div
          className="
            mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground
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
          {sheet ? <LearningAreaBadges areas={sheet.learningAreas} /> : null}
          <Badge variant="secondary">
            {as.entries.length} {as.entries.length === 1 ? "answer" : "answers"}
          </Badge>
          {as.date ? <span>Dated {formatDueDate(as.date)}</span> : null}
          {sheet && answerSheetMeetsDueDate(sheet, as)
            ? (
              <Badge
                variant="outline"
                className="border-green-600 text-green-600"
              >
                <CalendarCheck />
                Meets due date
              </Badge>
            )
            : null}
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
              questions={sheet?.questions ?? []}
              getEntry={getEntry}
              markCorrect={markCorrect}
              markWrong={markWrong}
              editCorrections={editCorrections}
              saveCorrection={saveCorrection}
            />
          )}

      <CorrectionModal
        slotId={correctingSlotId}
        label={correctingSlotId ? labels.get(correctingSlotId) ?? correctingSlotId : ""}
        entry={correctingSlotId ? getEntry(correctingSlotId) : null}
        setField={setField}
        onClose={closeModal}
      />
    </div>
  );
}

/**
 * The ✓ / ✗ review controls for one slot. The ✗ is revealed on hover; the ✓ is revealed on hover too.
 * When `persistentCorrect` (the grid), a marked-correct ✓ stays visible as the indicator; the list passes
 * `false` because it shows a persistent ✓/✗ mark to the left of the label instead.
 */
function HoverActions({
  slotId,
  correct,
  markCorrect,
  markWrong,
  persistentCorrect = true,
}: {
  slotId: string;
  correct: boolean | null;
  markCorrect: (slotId: string) => void;
  markWrong: (slotId: string) => void;
  persistentCorrect?: boolean;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Mark correct"
        aria-pressed={correct === true}
        className={cn(
          "size-6 text-green-600 transition-opacity",
          correct === true && persistentCorrect
            ? "opacity-100"
            : `
              opacity-0
              group-hover:opacity-100
            `,
        )}
        onClick={() => markCorrect(slotId)}
      >
        <Check className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="
          size-6 text-destructive opacity-0 transition-opacity
          group-hover:opacity-100
        "
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
                const corrected = entry.correction?.trim() ? entry.correction : null;
                return (
                  <td
                    key={colIndex}
                    className={!corrected && entry.correct === false
                      ? "border p-1 text-destructive"
                      : "border p-1"}
                  >
                    <div
                      className="
                        group flex min-h-7 items-center justify-between gap-2
                        px-1
                      "
                    >
                      <span
                        title={corrected && entry.value.trim()
                          ? `Your original: ${entry.value}`
                          : undefined}
                      >
                        {corrected ?? entry.value ?? ""}
                        {!corrected && !entry.value.trim()
                          ? <span className="text-muted-foreground">—</span>
                          : null}
                      </span>
                      <HoverActions
                        slotId={slotId}
                        correct={entry.correct}
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

/**
 * List rendering: one card per question, with the question's parts separated inside. A question card
 * appears once any of its slots is answered, and then shows all of the question's parts (unanswered
 * ones read "No answer").
 */
function ListCorrectableView({
  questions,
  getEntry,
  markCorrect,
  markWrong,
  editCorrections,
  saveCorrection,
}: {
  questions: QuestionSheetQuestion[];
  getEntry: (slotId: string) => AnswerSheetEntry;
  markCorrect: (slotId: string) => void;
  markWrong: (slotId: string) => void;
  editCorrections: (slotId: string) => void;
  saveCorrection: SaveCorrection;
}) {
  const cards = questions.map((q, i) => {
    const base = q.prompt.trim() || `Question ${i + 1}`;
    const parts = q.parts ?? [];
    const hasParts = parts.length > 0;
    const slots = hasParts
      ? parts.map(p => ({
        id: p.id,
        label: p.label as string | null,
      }))
      : [{
        id: q.id,
        label: null as string | null,
      }];
    return {
      key: q.id || `q${i}`,
      base,
      hasParts,
      slots,
      anyAnswered: slots.some(s => isAnswered(getEntry(s.id))),
    };
  }).filter(c => c.anyAnswered);

  if (cards.length === 0) {
    return <p className="text-sm text-muted-foreground">No answers recorded.</p>;
  }

  return (
    <div className="space-y-3">
      {cards.map(c => (
        <div
          key={c.key}
          className="space-y-2 rounded-md border p-3"
        >
          {c.hasParts ? <p className="text-sm font-medium">{c.base}</p> : null}
          <div className={c.hasParts ? "divide-y" : undefined}>
            {c.slots.map(s => (
              <div
                key={s.id}
                className={c.hasParts
                  ? `
                    py-3
                    first:pt-0
                    last:pb-0
                  `
                  : undefined}
              >
                <AnswerEntry
                  slotId={s.id}
                  label={c.hasParts ? s.label : c.base}
                  entry={getEntry(s.id)}
                  markCorrect={markCorrect}
                  markWrong={markWrong}
                  editCorrections={editCorrections}
                  saveCorrection={saveCorrection}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * One answered slot within a question card (no outer border — the card provides it). Mirrors the My
 * Sentences correction style: the corrected answer leads and the learner's original hides behind an
 * opt-in toggle that reveals a word/char diff (shown below the explanation).
 */
function AnswerEntry({
  slotId,
  label,
  entry,
  markCorrect,
  markWrong,
  editCorrections,
  saveCorrection,
}: {
  slotId: string;
  label: string | null;
  entry: AnswerSheetEntry;
  markCorrect: (slotId: string) => void;
  markWrong: (slotId: string) => void;
  editCorrections: (slotId: string) => void;
  saveCorrection: SaveCorrection;
}) {
  const corrected = entry.correction?.trim() ? entry.correction : null;
  const hasCorrections = hasCorrectionDetail(entry);
  // Un-reviewed = no verdict and no correction yet → offer the inline corrector; once reviewed/corrected
  // the standard corrected-leads display (with the marks under "Show your original") takes over.
  const unreviewed = entry.correct == null && !corrected;
  const [showOriginal, setShowOriginal] = useState(false);

  if (!isAnswered(entry)) {
    return (
      <p className="text-sm text-muted-foreground">
        {label ? <span className="font-medium">{label} — </span> : null}
        No answer
      </p>
    );
  }

  return (
    <div className="group space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {entry.correct === true
            ? <Check className="size-4 shrink-0 text-green-600" />
            : entry.correct === false || corrected
              ? <X className="size-4 shrink-0 text-destructive" />
              : null}
          {label ? <p className="text-sm font-medium">{label}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {hasCorrections
            ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => editCorrections(slotId)}
              >
                Edit corrections
              </Button>
            )
            : (
              <HoverActions
                slotId={slotId}
                correct={entry.correct}
                markCorrect={markCorrect}
                markWrong={markWrong}
                persistentCorrect={false}
              />
            )}
        </div>
      </div>

      {unreviewed
        ? (
          <SentenceCorrector
            text={entry.value}
            reasoning={entry.reasoning}
            onSave={r => saveCorrection(slotId, r)}
          />
        )
        : (
          <>
            <p className="text-xl font-semibold">
              {corrected ?? entry.value ?? ""}
              {!corrected && !entry.value.trim()
                ? (
                  <span
                    className="
                      text-base font-normal text-muted-foreground italic
                    "
                  >No answer
                  </span>
                )
                : null}
            </p>

            <EntryCorrections entry={entry} />

            {corrected
              ? (
                <div className="space-y-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOriginal(v => !v)}
                  >
                    {showOriginal
                      ? <EyeOff className="size-4" />
                      : <Eye className="size-4" />}
                    {showOriginal ? "Hide original" : "Show your original"}
                  </Button>
                  {showOriginal
                    ? (
                      <div
                        className="space-y-1 rounded-md border bg-muted/30 p-3"
                      >
                        <Label className="text-sm">Your original (with corrections)</Label>
                        <CorrectionDiff
                          written={entry.value}
                          correct={corrected}
                        />
                      </div>
                    )
                    : null}
                </div>
              )
              : null}
          </>
        )}
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
                <Label htmlFor="reason-modal">Explanation (Markdown)</Label>
                <Textarea
                  id="reason-modal"
                  value={entry.reasoning ?? ""}
                  onChange={e => setField(slotId, "reasoning", e.target.value)}
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

/** The supporting correction fields for one entry (explanation + meanings), each shown only when
 * present. The corrected answer itself leads the block, so it is not repeated here. */
function EntryCorrections({
  entry,
}: {
  entry: AnswerSheetEntry;
}) {
  return (
    <>
      {entry.reasoning
        ? (
          <div className="space-y-1">
            <Label className="text-sm">Explanation</Label>
            <Markdown
              content={entry.reasoning}
              className="text-muted-foreground"
            />
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

import type { AnswerSheet, AnswerSheetEntry } from "@sentence-bank/types";

import { useRef, useState } from "react";

import { Link } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";

import { AnswerCorrectionModal } from "@/components/AnswerCorrectionModal";
import { AnswerSheetGridView } from "@/components/AnswerSheetGridView";
import { AnswerSheetListView } from "@/components/AnswerSheetListView";
import { GrammarTermBadges } from "@/components/GrammarTermBadges";
import { LearningAreaBadges } from "@/components/LearningAreaBadges";
import { Badge } from "@/components/ui/badge";
import { useUpdateAnswerSheet } from "@/hooks/useAnswerSheets";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";
import {
  answerSheetMeetsDueDate,
  emptyAnswerEntry,
  isEntryTouched,
  questionSheetSlots,
} from "@/lib/answer-sheets";
import { formatDueDate } from "@/lib/due-date";

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
    return entries[slotId] ?? emptyAnswerEntry(slotId);
  }

  /** Persist a full entries map (ordered by slot) to the server. */
  function persist(map: Record<string, AnswerSheetEntry>) {
    const ordered = slots
      .map(s => map[s.id])
      .filter((e): e is AnswerSheetEntry => Boolean(e))
      .filter(isEntryTouched);
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
        ...(entries[slotId] ?? emptyAnswerEntry(slotId)),
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
        ...(prev[slotId] ?? emptyAnswerEntry(slotId)),
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
          {sheet ? <GrammarTermBadges terms={sheet.grammarTerms} /> : null}
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
            <AnswerSheetGridView
              grid={sheet.grid}
              getEntry={getEntry}
              markCorrect={markCorrect}
              markWrong={markWrong}
            />
          )
          : (
            <AnswerSheetListView
              questions={sheet?.questions ?? []}
              getEntry={getEntry}
              markCorrect={markCorrect}
              markWrong={markWrong}
              editCorrections={editCorrections}
              saveCorrection={saveCorrection}
            />
          )}

      <AnswerCorrectionModal
        slotId={correctingSlotId}
        label={correctingSlotId ? labels.get(correctingSlotId) ?? correctingSlotId : ""}
        entry={correctingSlotId ? getEntry(correctingSlotId) : null}
        setField={setField}
        onClose={closeModal}
      />
    </div>
  );
}

import type { AnswerSheet, AnswerSheetEntry, QuestionSheet } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";
import { questionSheetSlots } from "@/lib/answer-sheets";

/** True when an entry carries any correction detail worth showing beyond the raw answer. */
function hasCorrectionDetail(e: AnswerSheetEntry): boolean {
  return Boolean(e.correction || e.reasoning || e.intendedMeaning || e.actualMeaning);
}

/** Read-only render of one Answer Sheet. Grid-layout sheets render as a table; others as a list. */
export function AnswerSheetView({
  answerSheet: as,
}: {
  answerSheet: AnswerSheet;
}) {
  const sheets = useQuestionSheets();
  const sheet = (sheets.data ?? []).find(s => s.id === as.questionSheetId);
  const labels = new Map(sheet ? questionSheetSlots(sheet).map(s => [s.id, s.label]) : []);
  const isGrid = sheet?.layout === "grid" && sheet.grid != null;

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
          </div>
        </div>

        {as.entries.length === 0
          ? <p className="text-sm text-muted-foreground">No answers recorded.</p>
          : null}

        {isGrid && sheet?.grid
          ? (
            <GridAnswersView
              grid={sheet.grid}
              entries={as.entries}
              labels={labels}
            />
          )
          : (
            <ListAnswersView
              entries={as.entries}
              labels={labels}
            />
          )}
      </CardContent>
    </Card>
  );
}

/** The default list rendering: one bordered block per answered slot, with inline corrections. */
function ListAnswersView({
  entries,
  labels,
}: {
  entries: AnswerSheetEntry[];
  labels: Map<string, string>;
}) {
  return (
    <div className="space-y-3">
      {entries.map(entry => (
        <div
          key={entry.slotId}
          className="space-y-2 rounded-md border p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium">{labels.get(entry.slotId) ?? entry.slotId}</p>
            {entry.needsCorrection ? <NeedsCorrectionBadge /> : null}
          </div>
          <p className="text-base">
            {entry.value || <span className="text-muted-foreground italic">No answer</span>}
          </p>
          <EntryCorrections entry={entry} />
        </div>
      ))}
    </div>
  );
}

/**
 * The grid rendering: a labelled table of answers (cells highlight when flagged for correction), plus
 * a corrections detail list below for any answered cell that has correction notes.
 */
function GridAnswersView({
  grid,
  entries,
  labels,
}: {
  grid: NonNullable<QuestionSheet["grid"]>;
  entries: AnswerSheetEntry[];
  labels: Map<string, string>;
}) {
  const byId = new Map(entries.map(e => [e.slotId, e]));
  const withCorrections = entries.filter(e => e.needsCorrection || hasCorrectionDetail(e));

  return (
    <div className="space-y-4">
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
                  const entry = byId.get(`${row.id}:${colIndex}`);
                  return (
                    <td
                      key={colIndex}
                      className={entry?.needsCorrection
                        ? "border p-2 text-destructive"
                        : "border p-2"}
                    >
                      {entry?.value || <span className="text-muted-foreground">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {withCorrections.length > 0
        ? (
          <div className="space-y-3">
            <Label className="text-sm">Corrections</Label>
            {withCorrections.map(entry => (
              <div
                key={entry.slotId}
                className="space-y-2 rounded-md border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{labels.get(entry.slotId) ?? entry.slotId}</p>
                  {entry.needsCorrection ? <NeedsCorrectionBadge /> : null}
                </div>
                <p className="text-sm">
                  Answer: {entry.value || (
                    <span
                      className="text-muted-foreground italic"
                    >No answer
                    </span>
                  )}
                </p>
                <EntryCorrections entry={entry} />
              </div>
            ))}
          </div>
        )
        : null}
    </div>
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

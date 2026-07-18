import type { QuestionSheet, QuestionSheetPart } from "@sentence-bank/types";

import { CalendarCheck } from "lucide-react";

import { GrammarTermBadges } from "@/components/GrammarTermBadges";
import { LearningAreaBadges } from "@/components/LearningAreaBadges";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useAnswerSheetsForQuestionSheet } from "@/hooks/useAnswerSheets";
import { useBookmarksSettings } from "@/hooks/useSettings";
import { dueDateMet } from "@/lib/answer-sheets";
import { bookmarkAppUrl } from "@/lib/bookmarks";
import { formatDueDate, isOverdue } from "@/lib/due-date";

/** Read-only render of a question sheet's structure — a numbered list (with parts) or a grid. */
export function QuestionSheetView({
  questionSheet: qs,
}: {
  questionSheet: QuestionSheet;
}) {
  const {
    data: answerSheets,
  } = useAnswerSheetsForQuestionSheet(qs.id);
  const {
    data: bookmarksSettings,
  } = useBookmarksSettings();
  const met = dueDateMet(qs, answerSheets ?? []);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xl font-semibold">{qs.title}</p>
        <div
          className="
            mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground
          "
        >
          <Badge variant="secondary">{qs.layout === "grid" ? "Grid" : "List"}</Badge>
          {qs.page ? <Badge variant="outline">Page {qs.page}</Badge> : null}
          <LearningAreaBadges areas={qs.learningAreas} />
          <GrammarTermBadges terms={qs.grammarTerms} />
          {qs.bookmarkTitle
            ? (
              <span
                className="inline-flex max-w-full min-w-0 items-center gap-1"
              >
                <span className="shrink-0">Resources:</span>
                <Badge
                  variant="outline"
                  className="
                    max-w-full min-w-0 shrink wrap-break-word whitespace-normal
                  "
                >
                  {qs.bookmarkId
                    ? (
                      <a
                        href={bookmarkAppUrl(bookmarksSettings?.endpointUrl, qs.bookmarkId)}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {qs.bookmarkTitle}
                      </a>
                    )
                    : qs.bookmarkTitle}
                </Badge>
              </span>
            )
            : null}
          {qs.section ? <Badge variant="outline">Section: {qs.section.label}</Badge> : null}
          {qs.dueDate
            ? met
              ? (
                <Badge
                  variant="outline"
                  className="border-green-600 text-green-600"
                >
                  <CalendarCheck />
                  Due date met ·
                  {" "}
                  {formatDueDate(qs.dueDate)}
                </Badge>
              )
              : (
                <Badge variant={isOverdue(qs.dueDate, new Date()) ? "destructive" : "outline"}>
                  Due {formatDueDate(qs.dueDate)}
                </Badge>
              )
            : null}
        </div>
      </div>

      {qs.notes
        ? (
          <div className="space-y-1">
            <Label className="text-sm">Notes</Label>
            <p className="text-sm text-muted-foreground">{qs.notes}</p>
          </div>
        )
        : null}

      {qs.layout === "list"
        ? (
          <ol className="space-y-3">
            {qs.questions.map((q, index) => (
              <li
                key={q.id}
                className="space-y-1"
              >
                <p className="text-base">
                  <span className="font-medium text-muted-foreground">{index + 1}. </span>
                  {q.prompt}
                </p>
                <PartList parts={q.parts ?? []} />
              </li>
            ))}
            {qs.questions.length === 0
              ? <p className="text-sm text-muted-foreground">No questions yet.</p>
              : null}
          </ol>
        )
        : <GridPreview grid={qs.grid} />}
    </div>
  );
}

/** Read-only render of a question's parts, nesting sub-parts under their parent (indented per level). */
function PartList({
  parts,
}: {
  parts: QuestionSheetPart[];
}) {
  if (parts.length === 0) return null;
  return (
    <ul className="space-y-0.5 pl-6 text-sm text-muted-foreground">
      {parts.map(part => (
        <li key={part.id}>
          {part.label}
          <PartList parts={part.parts ?? []} />
        </li>
      ))}
    </ul>
  );
}

/** Read-only render of a grid layout as a labelled table (scrolls horizontally if wide). */
function GridPreview({
  grid,
}: {
  grid: QuestionSheet["grid"];
}) {
  if (!grid || grid.rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No rows yet.</p>;
  }
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
              {grid.columns.map((_, i) => (
                <td
                  key={i}
                  className="border p-2 text-muted-foreground"
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

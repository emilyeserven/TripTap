import type { AnswerSheet } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";

/** Compact list-item for one Answer Sheet: title link, source sheet, and answer/correction counts. */
export function AnswerSheetCard({
  answerSheet: as,
  onDelete,
}: {
  answerSheet: AnswerSheet;
  onDelete: (id: string) => void;
}) {
  const sheets = useQuestionSheets();
  const sheet = (sheets.data ?? []).find(s => s.id === as.questionSheetId);
  const needsCorrection = as.entries.filter(e => e.needsCorrection).length;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            to="/answer-sheets/$id"
            params={{
              id: as.id,
            }}
            className="
              text-lg font-semibold
              hover:underline
            "
          >
            {as.title ?? "Answer sheet"}
          </Link>
          <button
            type="button"
            className="
              text-sm text-destructive
              hover:underline
            "
            onClick={() => onDelete(as.id)}
          >
            Delete
          </button>
        </div>
        <div
          className="
            flex flex-wrap items-center gap-2 text-xs text-muted-foreground
          "
        >
          {sheet ? <span>From: {sheet.title}</span> : null}
          <Badge variant="secondary">
            {as.entries.length} {as.entries.length === 1 ? "answer" : "answers"}
          </Badge>
          {needsCorrection > 0
            ? (
              <Badge
                variant="outline"
                className="border-destructive/40 text-destructive"
              >
                {needsCorrection} to correct
              </Badge>
            )
            : null}
        </div>
      </CardContent>
    </Card>
  );
}

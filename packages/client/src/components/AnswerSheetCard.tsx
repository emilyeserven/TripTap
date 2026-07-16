import type { AnswerSheet } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";
import { answerSheetMeetsDueDate } from "@/lib/answer-sheets";
import { formatDueDate } from "@/lib/due-date";

/** Compact list-item for one Answer Sheet: title link, source sheet, and answer/correction counts. */
export function AnswerSheetCard({
  answerSheet: as,
}: {
  answerSheet: AnswerSheet;
}) {
  const sheets = useQuestionSheets();
  const sheet = (sheets.data ?? []).find(s => s.id === as.questionSheetId);
  const corrected = as.entries.filter(e => e.correction?.trim()).length;
  const meetsDueDate = sheet ? answerSheetMeetsDueDate(sheet, as) : false;

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
        </div>
        <div
          className="
            flex flex-wrap items-center gap-2 text-xs text-muted-foreground
          "
        >
          {sheet ? <span>From: {sheet.title}</span> : null}
          {as.date ? <span>Dated {formatDueDate(as.date)}</span> : null}
          <Badge variant="secondary">
            {as.entries.length} {as.entries.length === 1 ? "answer" : "answers"}
          </Badge>
          {corrected > 0
            ? (
              <Badge variant="outline">
                {corrected} corrected
              </Badge>
            )
            : null}
          {meetsDueDate
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
        </div>
      </CardContent>
    </Card>
  );
}

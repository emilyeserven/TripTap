import type { QuestionSheet } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { CalendarClockIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnswerSheets } from "@/hooks/useAnswerSheets";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";
import { dueDateMet } from "@/lib/answer-sheets";
import { formatDueDate, isDueSoon, isOverdue } from "@/lib/due-date";

/** How far ahead (in days) a due question sheet counts as "due soon". */
const DUE_SOON_DAYS = 7;
/** Cap on how many due sheets the card shows at once. */
const DUE_SOON_LIMIT = 5;

function hasDueDate(sheet: QuestionSheet): sheet is QuestionSheet & { dueDate: string } {
  return sheet.dueDate !== null;
}

/** Card surfacing question sheets that are overdue or due within {@link DUE_SOON_DAYS} days. */
export function DueSoonCard() {
  const {
    data: sheets,
  } = useQuestionSheets();
  const {
    data: answerSheets,
  } = useAnswerSheets();
  const now = new Date();
  const due = (sheets ?? [])
    .filter(hasDueDate)
    .filter(s => isDueSoon(s.dueDate, now, DUE_SOON_DAYS))
    // Drop sheets already met by a completed, in-window answer sheet — they no longer need attention.
    .filter(s => !dueDateMet(s, (answerSheets ?? []).filter(as => as.questionSheetId === s.id)))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, DUE_SOON_LIMIT);

  if (due.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClockIcon className="size-4" />
          Question sheets due soon
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {due.map(sheet => (
          <Link
            key={sheet.id}
            to="/question-sheets/$id"
            params={{
              id: sheet.id,
            }}
            className="
              flex items-center justify-between gap-2 rounded-md border p-2
              text-sm transition-colors
              hover:bg-accent
            "
          >
            <span className="font-medium">{sheet.title}</span>
            <Badge variant={isOverdue(sheet.dueDate, now) ? "destructive" : "outline"}>
              Due {formatDueDate(sheet.dueDate)}
            </Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

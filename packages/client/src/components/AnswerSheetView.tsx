import type { AnswerSheet } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";
import { questionSheetSlots } from "@/lib/answer-sheets";

/** Read-only render of one Answer Sheet: each answered slot's answer, plus corrections when present. */
export function AnswerSheetView({
  answerSheet: as,
}: {
  answerSheet: AnswerSheet;
}) {
  const sheets = useQuestionSheets();
  const sheet = (sheets.data ?? []).find(s => s.id === as.questionSheetId);
  const labels = new Map(sheet ? questionSheetSlots(sheet).map(s => [s.id, s.label]) : []);

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

        <div className="space-y-3">
          {as.entries.map(entry => (
            <div
              key={entry.slotId}
              className="space-y-2 rounded-md border p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{labels.get(entry.slotId) ?? entry.slotId}</p>
                {entry.needsCorrection
                  ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-destructive/40 text-destructive"
                    >
                      <TriangleAlert className="size-3" />
                      Needs correction
                    </Badge>
                  )
                  : null}
              </div>
              <p className="text-base">{entry.value || (
                <span
                  className="text-muted-foreground italic"
                >No answer
                </span>
              )}
              </p>

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
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

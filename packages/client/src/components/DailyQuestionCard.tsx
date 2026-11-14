import type { DailyQuestion } from "@/lib/daily-question";
import type { AnswerSheet, QuestionSheet } from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { Link } from "@tanstack/react-router";
import { CheckCircle2, NotebookPen, SkipForward } from "lucide-react";

import { AnswerChoiceGroup } from "@/components/AnswerChoiceGroup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useCreateAnswerSheet, useUpdateAnswerSheet } from "@/hooks/useAnswerSheets";
import { generateAnswerSheetTitle, questionSheetDisplayTitle } from "@/lib/answer-sheets";
import { dailyQuestionQueue, entriesWithAnswer } from "@/lib/daily-question";
import { formatDueDate, isOverdue, todayCalendarDayIso } from "@/lib/due-date";

/**
 * One homework question a day (or a few): the next unanswered question from the learner's question
 * sheets, shown with its exercise instructions so it can be answered without opening the textbook.
 * The answer is saved into that sheet's current answer sheet (starting one if needed), so the usual
 * answer-sheet review, scoring, and "copy for teacher" all pick it up.
 */
export function DailyQuestionCard({
  questionSheets,
  answerSheets,
}: {
  questionSheets: QuestionSheet[];
  answerSheets: AnswerSheet[];
}) {
  const create = useCreateAnswerSheet();
  const update = useUpdateAnswerSheet();
  const [answer, setAnswer] = useState("");
  const [skip, setSkip] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  // Answer sheets saved from this card, by id. Overlaid on the fetched list so the next pick sees the
  // answer (and a just-created attempt) right away, instead of waiting for the list to refetch — which
  // would otherwise re-serve the same question or start a second answer sheet for the same homework.
  const [savedSheets, setSavedSheets] = useState<Map<string, AnswerSheet>>(() => new Map());
  const [lastSaved, setLastSaved] = useState<{ answerSheetId: string;
    label: string; } | null>(null);

  const queue = useMemo(() => {
    const merged = [
      ...answerSheets.filter(as => !savedSheets.has(as.id)),
      ...savedSheets.values(),
    ];
    return dailyQuestionQueue(questionSheets, merged);
  }, [questionSheets, answerSheets, savedSheets]);
  const current: DailyQuestion | undefined = queue.length > 0 ? queue[skip % queue.length] : undefined;
  const sheetCount = new Set(queue.map(q => q.sheet.id)).size;
  const pending = create.isPending || update.isPending;

  async function save() {
    if (!current || !answer.trim()) return;
    const value = answer.trim();
    const {
      sheet, answerSheet, slotId,
    } = current;
    const entries = entriesWithAnswer(sheet, answerSheet?.entries ?? [], slotId, value);
    const saved = answerSheet
      ? await update.mutateAsync({
        id: answerSheet.id,
        input: {
          entries,
          // Date an undated attempt today, so it can count toward the sheet's due date.
          ...(answerSheet.date
            ? {}
            : {
              date: todayCalendarDayIso(),
            }),
        },
      })
      : await create.mutateAsync({
        questionSheetId: sheet.id,
        title: generateAnswerSheetTitle(sheet),
        date: todayCalendarDayIso(),
        entries,
      });
    setSavedSheets(prev => new Map(prev).set(saved.id, saved));
    setAnsweredCount(n => n + 1);
    setLastSaved({
      answerSheetId: saved.id,
      label: questionSheetDisplayTitle(sheet),
    });
    setAnswer("");
  }

  function skipQuestion() {
    setSkip(n => n + 1);
    setAnswer("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <NotebookPen className="size-4" />
            Daily question
          </span>
          {queue.length > 0 && (
            <span
              className="text-sm font-normal text-muted-foreground tabular-nums"
            >
              {queue.length} left · {sheetCount} {sheetCount === 1 ? "sheet" : "sheets"}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastSaved
          ? (
            <p
              className="
                flex flex-wrap items-center gap-1.5 text-sm
                text-muted-foreground
              "
            >
              <CheckCircle2 className="size-4 text-green-600" />
              Saved
              {answeredCount > 1 ? ` (${answeredCount} today)` : ""}
              {" "}
              to
              {" "}
              <Link
                to="/answer-sheets/$id"
                params={{
                  id: lastSaved.answerSheetId,
                }}
                className="
                  text-primary
                  hover:underline
                "
              >
                {lastSaved.label}
              </Link>
              .
              {current ? " Here’s the next one if you have a minute." : null}
            </p>
          )
          : null}

        {!current
          ? (
            <p className="text-sm text-muted-foreground">
              {answeredCount > 0
                ? "That’s every question you have written down — nice work."
                : (
                  <>
                    No questions to serve yet. Add the question text to a sheet’s parts (or use
                    {" "}
                    <span className="font-medium">Fill from photos</span>
                    {" "}
                    on a
                    {" "}
                    <Link
                      to="/question-sheets/new"
                      className="
                        text-primary
                        hover:underline
                      "
                    >
                      question sheet
                    </Link>
                    ) and they’ll show up here one at a time.
                  </>
                )}
            </p>
          )
          : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <div
                className="
                  flex flex-wrap items-center gap-2 text-xs
                  text-muted-foreground
                "
              >
                <Link
                  to="/question-sheets/$id"
                  params={{
                    id: current.sheet.id,
                  }}
                  className="hover:text-foreground"
                >
                  {questionSheetDisplayTitle(current.sheet)}
                </Link>
                {current.sheet.page ? <Badge variant="outline">Page {current.sheet.page}</Badge> : null}
                {current.sheet.dueDate
                  ? (
                    <Badge
                      variant={isOverdue(current.sheet.dueDate, new Date()) ? "destructive" : "outline"}
                    >
                      Due {formatDueDate(current.sheet.dueDate)}
                    </Badge>
                  )
                  : null}
              </div>

              {current.context.length > 0
                ? (
                  <div className="space-y-1 rounded-md bg-muted/50 p-3 text-sm">
                    {current.context.map((step, i) => (
                      <p
                        key={i}
                        className="whitespace-pre-wrap"
                        style={{
                          paddingLeft: `${i * 0.75}rem`,
                        }}
                      >
                        <span className="font-medium text-muted-foreground">{step.label}</span>
                        {step.text ? <> {step.text}</> : null}
                      </p>
                    ))}
                  </div>
                )
                : null}

              <p className="text-lg whitespace-pre-wrap">
                <span className="mr-2 text-sm font-medium text-muted-foreground">{current.label}</span>
                {current.text}
              </p>

              {current.choices && current.choices.length > 0
                ? (
                  <AnswerChoiceGroup
                    value={answer}
                    choices={current.choices}
                    onSelect={setAnswer}
                    ariaLabel="Your answer"
                  />
                )
                : (
                  <Textarea
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    placeholder="Your answer"
                    rows={2}
                    aria-label="Your answer"
                  />
                )}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={!answer.trim() || pending}
                >
                  {pending ? "Saving…" : "Save answer"}
                </Button>
                {queue.length > 1
                  ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={skipQuestion}
                    >
                      <SkipForward className="size-4" />
                      Skip for now
                    </Button>
                  )
                  : null}
              </div>
            </form>
          )}
      </CardContent>
    </Card>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { AnswerSheetCard } from "@/components/AnswerSheetCard";
import { QuestionSheetCard } from "@/components/QuestionSheetCard";
import { Button } from "@/components/ui/button";
import { useAnswerSheets } from "@/hooks/useAnswerSheets";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";

export const Route = createFileRoute("/book-exercises/")({
  component: BookExercisesPage,
});

function BookExercisesPage() {
  usePageTitle("Book Exercises");
  const {
    data: questionSheets, isLoading: questionSheetsLoading, error: questionSheetsError,
  } = useQuestionSheets();

  const {
    data: answerSheets, isLoading: answerSheetsLoading, error: answerSheetsError,
  } = useAnswerSheets();

  return (
    <section className="max-w-4xl space-y-10">
      <div>
        <p className="text-sm text-muted-foreground">
          Question sheets and answer sheets for working through textbook exercises.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Question Sheets</h2>
          <Button
            asChild
            size="sm"
          >
            <Link to="/question-sheets/new">
              <Plus className="size-4" />
              New question sheet
            </Link>
          </Button>
        </div>

        {questionSheetsError ? <p className="text-destructive">{questionSheetsError.message}</p> : null}
        {questionSheetsLoading ? <p className="text-muted-foreground">Loading…</p> : null}
        {!questionSheetsLoading && (questionSheets ?? []).length === 0 && (
          <p className="text-muted-foreground">No question sheets yet.</p>
        )}

        <div className="space-y-4">
          {(questionSheets ?? []).map(qs => (
            <QuestionSheetCard
              key={qs.id}
              questionSheet={qs}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Answer Sheets</h2>
          <Button
            asChild
            size="sm"
          >
            <Link to="/answer-sheets/new">
              <Plus className="size-4" />
              New answer sheet
            </Link>
          </Button>
        </div>

        {answerSheetsError ? <p className="text-destructive">{answerSheetsError.message}</p> : null}
        {answerSheetsLoading ? <p className="text-muted-foreground">Loading…</p> : null}
        {!answerSheetsLoading && (answerSheets ?? []).length === 0 && (
          <p className="text-muted-foreground">No answer sheets yet.</p>
        )}

        <div className="space-y-4">
          {(answerSheets ?? []).map(as => (
            <AnswerSheetCard
              key={as.id}
              answerSheet={as}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

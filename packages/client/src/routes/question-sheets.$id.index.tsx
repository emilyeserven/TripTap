import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";

import { QuestionSheetAnswerSheets } from "@/components/QuestionSheetAnswerSheets";
import { QuestionSheetView } from "@/components/QuestionSheetView";
import { Button } from "@/components/ui/button";
import { useQuestionSheet } from "@/hooks/useQuestionSheets";

export const Route = createFileRoute("/question-sheets/$id/")({
  component: ViewQuestionSheetPage,
});

function ViewQuestionSheetPage() {
  const {
    id,
  } = Route.useParams();
  const {
    data, isLoading, error,
  } = useQuestionSheet(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Question sheet not found.</p>;

  return (
    <section className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
        >
          <Link to="/question-sheets">
            <ArrowLeft className="size-4" />
            All question sheets
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <Link
              to="/question-sheets/$id/edit"
              params={{
                id,
              }}
            >
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <Link
              to="/answer-sheets/new"
              search={{
                questionSheetId: id,
              }}
            >
              Answer this sheet
            </Link>
          </Button>
        </div>
      </div>

      <QuestionSheetView questionSheet={data} />

      <QuestionSheetAnswerSheets questionSheetId={id} />
    </section>
  );
}

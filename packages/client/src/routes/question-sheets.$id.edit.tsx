import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { QuestionSheetForm } from "@/components/QuestionSheetForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDeleteQuestionSheet, useQuestionSheet } from "@/hooks/useQuestionSheets";

export const Route = createFileRoute("/question-sheets/$id/edit")({
  component: EditQuestionSheetPage,
});

function EditQuestionSheetPage() {
  usePageTitle("Edit question sheet");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const deleteQuestionSheet = useDeleteQuestionSheet();
  const {
    data, isLoading, error,
  } = useQuestionSheet(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Question sheet not found.</p>;

  const remove = () => {
    deleteQuestionSheet.mutate(id, {
      onSuccess: () => navigate({
        to: "/question-sheets",
      }),
    });
  };

  return (
    <section className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
        >
          <Link
            to="/question-sheets/$id"
            params={{
              id,
            }}
          >
            <ArrowLeft className="size-4" />
            Back to question sheet
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={deleteQuestionSheet.isPending}
          onClick={remove}
        >
          Delete
        </Button>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">
          Update the title, notes, tags, or the questions/grid.
        </p>
      </div>
      <QuestionSheetForm
        questionSheet={data}
        onSuccess={() =>
          navigate({
            to: "/question-sheets/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}

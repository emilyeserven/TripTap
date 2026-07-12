import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { QuestionSheetForm } from "@/components/QuestionSheetForm";
import { Button } from "@/components/ui/button";
import { useQuestionSheet } from "@/hooks/useQuestionSheets";

export const Route = createFileRoute("/question-sheets/$id/edit")({
  component: EditQuestionSheetPage,
});

function EditQuestionSheetPage() {
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const {
    data, isLoading, error,
  } = useQuestionSheet(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Question sheet not found.</p>;

  return (
    <section className="max-w-3xl space-y-6">
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
      <div>
        <h1 className="text-2xl font-bold">Edit question sheet</h1>
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

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AnswerSheetForm } from "@/components/AnswerSheetForm";
import { Button } from "@/components/ui/button";
import { useAnswerSheet } from "@/hooks/useAnswerSheets";

export const Route = createFileRoute("/answer-sheets/$id/edit")({
  component: EditAnswerSheetPage,
});

function EditAnswerSheetPage() {
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const {
    data, isLoading, error,
  } = useAnswerSheet(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Answer sheet not found.</p>;

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link
          to="/answer-sheets/$id"
          params={{
            id,
          }}
        >
          <ArrowLeft className="size-4" />
          Back to answer sheet
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-bold">Edit answer sheet</h1>
        <p className="text-sm text-muted-foreground">
          Update your answers, or use the Corrections tab to record what went wrong and why.
        </p>
      </div>
      <AnswerSheetForm
        answerSheet={data}
        onSuccess={() =>
          navigate({
            to: "/answer-sheets/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}

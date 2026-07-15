import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AnswerSheetForm } from "@/components/AnswerSheetForm";
import { Button } from "@/components/ui/button";
import { useAnswerSheet, useDeleteAnswerSheet } from "@/hooks/useAnswerSheets";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/answer-sheets/$id/edit")({
  component: EditAnswerSheetPage,
});

function EditAnswerSheetPage() {
  usePageTitle("Edit answer sheet");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const deleteAnswerSheet = useDeleteAnswerSheet();
  const {
    data, isLoading, error,
  } = useAnswerSheet(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Answer sheet not found.</p>;

  const remove = () => {
    deleteAnswerSheet.mutate(id, {
      onSuccess: () => navigate({
        to: "/answer-sheets",
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
            to="/answer-sheets/$id"
            params={{
              id,
            }}
          >
            <ArrowLeft className="size-4" />
            Done — back to answer sheet
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={deleteAnswerSheet.isPending}
          onClick={remove}
        >
          Delete
        </Button>
      </div>
      <AnswerSheetForm answerSheet={data} />
    </section>
  );
}

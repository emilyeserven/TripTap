import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";

import { AnswerSheetView } from "@/components/AnswerSheetView";
import { Button } from "@/components/ui/button";
import { useAnswerSheet, useDeleteAnswerSheet } from "@/hooks/useAnswerSheets";

export const Route = createFileRoute("/answer-sheets/$id/")({
  component: ViewAnswerSheetPage,
});

function ViewAnswerSheetPage() {
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const {
    data, isLoading, error,
  } = useAnswerSheet(id);
  const deleteSheet = useDeleteAnswerSheet();

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Answer sheet not found.</p>;

  const remove = () => {
    deleteSheet.mutate(id, {
      onSuccess: () =>
        navigate({
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
          <Link to="/answer-sheets">
            <ArrowLeft className="size-4" />
            All answer sheets
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <Link
              to="/answer-sheets/$id/edit"
              params={{
                id,
              }}
            >
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            disabled={deleteSheet.isPending}
            onClick={remove}
          >
            Delete
          </Button>
        </div>
      </div>

      <AnswerSheetView answerSheet={data} />
    </section>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";

import { AnswerSheetView } from "@/components/AnswerSheetView";
import { Button } from "@/components/ui/button";
import { useAnswerSheet } from "@/hooks/useAnswerSheets";

export const Route = createFileRoute("/answer-sheets/$id/")({
  component: ViewAnswerSheetPage,
});

function ViewAnswerSheetPage() {
  const {
    id,
  } = Route.useParams();
  const {
    data, isLoading, error,
  } = useAnswerSheet(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Answer sheet not found.</p>;

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
        </div>
      </div>

      <AnswerSheetView answerSheet={data} />
    </section>
  );
}

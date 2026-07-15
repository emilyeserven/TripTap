import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AnswerSheetForm } from "@/components/AnswerSheetForm";
import { Button } from "@/components/ui/button";
import { useAnswerSheet } from "@/hooks/useAnswerSheets";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/answer-sheets/$id/edit")({
  component: EditAnswerSheetPage,
});

function EditAnswerSheetPage() {
  usePageTitle("Edit answer sheet");
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
      <AnswerSheetForm answerSheet={data} />
    </section>
  );
}

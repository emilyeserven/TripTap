import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { QuestionSheetForm } from "@/components/QuestionSheetForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/question-sheets/new")({
  component: NewQuestionSheetPage,
});

function NewQuestionSheetPage() {
  usePageTitle("New question sheet");
  const navigate = useNavigate();

  return (
    <section className="max-w-3xl space-y-6">
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
      <div>
        <p className="text-sm text-muted-foreground">
          Capture the questions from a textbook or worksheet as a reusable template — a list of
          questions (with optional parts) or a grid/table.
        </p>
      </div>
      <QuestionSheetForm
        onSuccess={id =>
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

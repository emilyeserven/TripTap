import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AnswerSheetForm } from "@/components/AnswerSheetForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

interface NewAnswerSheetSearch {
  questionSheetId?: string;
}

export const Route = createFileRoute("/answer-sheets/new")({
  validateSearch: (search: Record<string, unknown>): NewAnswerSheetSearch => ({
    questionSheetId:
      typeof search.questionSheetId === "string" ? search.questionSheetId : undefined,
  }),
  component: NewAnswerSheetPage,
});

function NewAnswerSheetPage() {
  usePageTitle("New answer sheet");
  const navigate = useNavigate();
  const {
    questionSheetId,
  } = Route.useSearch();

  return (
    <section className="max-w-3xl space-y-6">
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
      <div>
        <p className="text-sm text-muted-foreground">
          Pick a question sheet and fill in your answers. You can add corrections now or come back to
          them later.
        </p>
      </div>
      <AnswerSheetForm
        initialQuestionSheetId={questionSheetId}
        onSuccess={id =>
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

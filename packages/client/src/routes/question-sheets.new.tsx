import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { QuestionSheetForm } from "@/components/QuestionSheetForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

interface NewQuestionSheetSearch {
  bookmarkId?: string;
  bookmarkTitle?: string;
  bookmarkUrl?: string;
}

export const Route = createFileRoute("/question-sheets/new")({
  component: NewQuestionSheetPage,
  validateSearch: (search: Record<string, unknown>): NewQuestionSheetSearch => ({
    bookmarkId: typeof search.bookmarkId === "string" ? search.bookmarkId : undefined,
    bookmarkTitle: typeof search.bookmarkTitle === "string" ? search.bookmarkTitle : undefined,
    bookmarkUrl: typeof search.bookmarkUrl === "string" ? search.bookmarkUrl : undefined,
  }),
});

function NewQuestionSheetPage() {
  usePageTitle("New question sheet");
  const navigate = useNavigate();
  const {
    bookmarkId, bookmarkTitle, bookmarkUrl,
  } = Route.useSearch();

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
        initialResource={bookmarkId
          ? {
            bookmarkId,
            bookmarkTitle: bookmarkTitle ?? null,
            bookmarkUrl: bookmarkUrl ?? null,
          }
          : undefined}
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

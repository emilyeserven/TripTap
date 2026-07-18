import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ReadingSessionForm } from "@/components/ReadingSessionForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/reading-sessions/new")({
  validateSearch: (search: Record<string, unknown>): { title?: string } => ({
    title: typeof search.title === "string" ? search.title : undefined,
  }),
  component: NewReadingSessionPage,
});

function NewReadingSessionPage() {
  usePageTitle("New reading session");
  const navigate = useNavigate();
  const {
    title,
  } = Route.useSearch();

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/reading-sessions">
          <ArrowLeft className="size-4" />
          All reading sessions
        </Link>
      </Button>
      <div>
        <p className="text-sm text-muted-foreground">
          Note where the reading came from, translate it freeform or line-by-line, and jot down the
          words you were shaky on or didn’t know.
        </p>
      </div>
      <ReadingSessionForm
        initialTitle={title}
        onSuccess={id =>
          navigate({
            to: "/reading-sessions/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}

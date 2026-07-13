import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ReadingSessionForm } from "@/components/ReadingSessionForm";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reading-sessions/new")({
  component: NewReadingSessionPage,
});

function NewReadingSessionPage() {
  const navigate = useNavigate();

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
        <h1 className="text-2xl font-bold">New reading session</h1>
        <p className="text-sm text-muted-foreground">
          Note where the reading came from, translate it freeform or line-by-line, and jot down the
          words you were shaky on or didn’t know.
        </p>
      </div>
      <ReadingSessionForm
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

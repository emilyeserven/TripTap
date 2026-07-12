import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ListeningSessionForm } from "@/components/ListeningSessionForm";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/listening-sessions/new")({
  component: NewListeningSessionPage,
});

function NewListeningSessionPage() {
  const navigate = useNavigate();

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/listening-sessions">
          <ArrowLeft className="size-4" />
          All sessions
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-bold">New listening session</h1>
        <p className="text-sm text-muted-foreground">
          Pick a bookmark or paste a YouTube link, then open the session to start taking notes.
        </p>
      </div>
      <ListeningSessionForm
        onSuccess={id =>
          navigate({
            to: "/listening-sessions/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}

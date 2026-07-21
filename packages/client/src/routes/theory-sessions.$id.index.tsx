import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";

import { TheorySessionView } from "@/components/TheorySessionView";
import { Button } from "@/components/ui/button";
import { useTheorySession } from "@/hooks/useTheorySessions";

export const Route = createFileRoute("/theory-sessions/$id/")({
  component: ViewTheorySessionPage,
});

function ViewTheorySessionPage() {
  const {
    id,
  } = Route.useParams();
  const {
    data, isLoading, error,
  } = useTheorySession(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Theory session not found.</p>;

  return (
    <section className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
        >
          <Link to="/theory-sessions">
            <ArrowLeft className="size-4" />
            All sessions
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <Link
              to="/theory-sessions/$id/edit"
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

      <TheorySessionView session={data} />
    </section>
  );
}

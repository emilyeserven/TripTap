import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";

import { ReadingSessionView } from "@/components/ReadingSessionView";
import { Button } from "@/components/ui/button";
import { useReadingSession } from "@/hooks/useReadingSessions";

export const Route = createFileRoute("/reading-sessions/$id/")({
  component: ViewReadingSessionPage,
});

function ViewReadingSessionPage() {
  const {
    id,
  } = Route.useParams();
  const {
    data, isLoading, error,
  } = useReadingSession(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Reading session not found.</p>;

  return (
    <section className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <Link
              to="/reading-sessions/$id/edit"
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

      <ReadingSessionView session={data} />
    </section>
  );
}

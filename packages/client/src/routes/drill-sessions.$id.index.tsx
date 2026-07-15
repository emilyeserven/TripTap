import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";

import { DrillSessionView } from "@/components/DrillSessionView";
import { Button } from "@/components/ui/button";
import { useDrillSession } from "@/hooks/useDrillSessions";

export const Route = createFileRoute("/drill-sessions/$id/")({
  component: ViewDrillSessionPage,
});

function ViewDrillSessionPage() {
  const {
    id,
  } = Route.useParams();
  const {
    data, isLoading, error,
  } = useDrillSession(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Drill session not found.</p>;

  return (
    <section className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
        >
          <Link to="/drill-sessions">
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
              to="/drill-sessions/$id/edit"
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

      <DrillSessionView session={data} />
    </section>
  );
}

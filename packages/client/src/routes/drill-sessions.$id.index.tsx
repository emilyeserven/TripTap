import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";

import { DrillSessionView } from "@/components/DrillSessionView";
import { Button } from "@/components/ui/button";
import { useDeleteDrillSession, useDrillSession } from "@/hooks/useDrillSessions";

export const Route = createFileRoute("/drill-sessions/$id/")({
  component: ViewDrillSessionPage,
});

function ViewDrillSessionPage() {
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const {
    data, isLoading, error,
  } = useDrillSession(id);
  const deleteSession = useDeleteDrillSession();

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Drill session not found.</p>;

  const remove = () => {
    deleteSession.mutate(id, {
      onSuccess: () =>
        navigate({
          to: "/drill-sessions",
        }),
    });
  };

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
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            disabled={deleteSession.isPending}
            onClick={remove}
          >
            Delete
          </Button>
        </div>
      </div>

      <DrillSessionView session={data} />
    </section>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { DrillSessionForm } from "@/components/DrillSessionForm";
import { Button } from "@/components/ui/button";
import { useDeleteDrillSession, useDrillSession } from "@/hooks/useDrillSessions";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/drill-sessions/$id/edit")({
  component: EditDrillSessionPage,
});

function EditDrillSessionPage() {
  usePageTitle("Edit drill session");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const deleteDrillSession = useDeleteDrillSession();
  const {
    data, isLoading, error,
  } = useDrillSession(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Drill session not found.</p>;

  const remove = () => {
    deleteDrillSession.mutate(id, {
      onSuccess: () => navigate({
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
          <Link
            to="/drill-sessions/$id"
            params={{
              id,
            }}
          >
            <ArrowLeft className="size-4" />
            Back to session
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={deleteDrillSession.isPending}
          onClick={remove}
        >
          Delete
        </Button>
      </div>
      <DrillSessionForm
        session={data}
        onSuccess={() =>
          navigate({
            to: "/drill-sessions/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}

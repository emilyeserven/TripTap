import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { DrillSessionForm } from "@/components/DrillSessionForm";
import { Button } from "@/components/ui/button";
import { useDrillSession } from "@/hooks/useDrillSessions";
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
  const {
    data, isLoading, error,
  } = useDrillSession(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Drill session not found.</p>;

  return (
    <section className="max-w-3xl space-y-6">
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

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ShadowingSessionForm } from "@/components/ShadowingSessionForm";
import { Button } from "@/components/ui/button";
import { useShadowingSession } from "@/hooks/useShadowingSessions";

export const Route = createFileRoute("/shadowing/$id/edit")({
  component: EditShadowingSessionPage,
});

function EditShadowingSessionPage() {
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const {
    data, isLoading, error,
  } = useShadowingSession(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Session not found.</p>;

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link
          to="/shadowing/$id"
          params={{
            id,
          }}
        >
          <ArrowLeft className="size-4" />
          Back to session
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-bold">Edit session</h1>
      </div>
      <ShadowingSessionForm
        session={data}
        onSuccess={() =>
          navigate({
            to: "/shadowing/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ShadowingSessionForm } from "@/components/ShadowingSessionForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDeleteShadowingSession, useShadowingSession } from "@/hooks/useShadowingSessions";

export const Route = createFileRoute("/shadowing/$id/edit")({
  component: EditShadowingSessionPage,
});

function EditShadowingSessionPage() {
  usePageTitle("Edit session");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const deleteShadowingSession = useDeleteShadowingSession();
  const {
    data, isLoading, error,
  } = useShadowingSession(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Session not found.</p>;

  const remove = () => {
    deleteShadowingSession.mutate(id, {
      onSuccess: () => navigate({
        to: "/shadowing",
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
            to="/shadowing/$id"
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
          disabled={deleteShadowingSession.isPending}
          onClick={remove}
        >
          Delete
        </Button>
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

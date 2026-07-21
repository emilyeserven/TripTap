import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { TheorySessionForm } from "@/components/TheorySessionForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDeleteTheorySession, useTheorySession } from "@/hooks/useTheorySessions";

export const Route = createFileRoute("/theory-sessions/$id/edit")({
  component: EditTheorySessionPage,
});

function EditTheorySessionPage() {
  usePageTitle("Edit theory session");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const deleteTheorySession = useDeleteTheorySession();
  const {
    data, isLoading, error,
  } = useTheorySession(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Theory session not found.</p>;

  const remove = () => {
    deleteTheorySession.mutate(id, {
      onSuccess: () => navigate({
        to: "/theory-sessions",
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
            to="/theory-sessions/$id"
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
          disabled={deleteTheorySession.isPending}
          onClick={remove}
        >
          Delete
        </Button>
      </div>
      <TheorySessionForm
        session={data}
        onSuccess={() =>
          navigate({
            to: "/theory-sessions/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}

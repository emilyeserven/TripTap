import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ListeningSessionForm } from "@/components/ListeningSessionForm";
import { Button } from "@/components/ui/button";
import { useListeningSession } from "@/hooks/useListeningSessions";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/listening-sessions/$id/edit")({
  component: EditListeningSessionPage,
});

function EditListeningSessionPage() {
  usePageTitle("Edit session");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const {
    data, isLoading, error,
  } = useListeningSession(id);

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
          to="/listening-sessions/$id"
          params={{
            id,
          }}
        >
          <ArrowLeft className="size-4" />
          Back to session
        </Link>
      </Button>
      <ListeningSessionForm
        session={data}
        onSuccess={() =>
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

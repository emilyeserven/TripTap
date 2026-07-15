import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ListeningSessionForm } from "@/components/ListeningSessionForm";
import { Button } from "@/components/ui/button";
import { useDeleteListeningSession, useListeningSession } from "@/hooks/useListeningSessions";
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
  const deleteListeningSession = useDeleteListeningSession();
  const {
    data, isLoading, error,
  } = useListeningSession(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Session not found.</p>;

  const remove = () => {
    deleteListeningSession.mutate(id, {
      onSuccess: () => navigate({
        to: "/listening-sessions",
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
            to="/listening-sessions/$id"
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
          disabled={deleteListeningSession.isPending}
          onClick={remove}
        >
          Delete
        </Button>
      </div>
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

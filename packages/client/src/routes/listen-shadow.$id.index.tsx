import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";

import { ListeningSessionView } from "@/components/ListeningSessionView";
import { Button } from "@/components/ui/button";
import { useDeleteListeningSession, useListeningSession } from "@/hooks/useListeningSessions";

export const Route = createFileRoute("/listen-shadow/$id/")({
  component: ViewListeningSessionPage,
});

function ViewListeningSessionPage() {
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const {
    data, isLoading, error,
  } = useListeningSession(id);
  const remove = useDeleteListeningSession();

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Session not found.</p>;

  const onDelete = () => {
    remove.mutate(id, {
      onSuccess: () =>
        navigate({
          to: "/listen-shadow",
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
          <Link to="/listen-shadow">
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
              to="/listen-shadow/$id/edit"
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
            disabled={remove.isPending}
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{data.title}</h1>
      </div>

      <ListeningSessionView session={data} />
    </section>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";

import { ShadowingSessionView } from "@/components/ShadowingSessionView";
import { Button } from "@/components/ui/button";
import { useDeleteShadowingSession, useShadowingSession } from "@/hooks/useShadowingSessions";

export const Route = createFileRoute("/shadowing/$id/")({
  component: ViewShadowingSessionPage,
});

function ViewShadowingSessionPage() {
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const {
    data, isLoading, error,
  } = useShadowingSession(id);
  const remove = useDeleteShadowingSession();

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Session not found.</p>;

  const onDelete = () => {
    remove.mutate(id, {
      onSuccess: () =>
        navigate({
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
          <Link to="/shadowing">
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
              to="/shadowing/$id/edit"
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

      <ShadowingSessionView session={data} />
    </section>
  );
}

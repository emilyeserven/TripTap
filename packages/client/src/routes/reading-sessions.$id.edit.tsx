import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ReadingSessionForm } from "@/components/ReadingSessionForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDeleteReadingSession, useReadingSession } from "@/hooks/useReadingSessions";

export const Route = createFileRoute("/reading-sessions/$id/edit")({
  component: EditReadingSessionPage,
});

function EditReadingSessionPage() {
  usePageTitle("Edit reading session");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const deleteReadingSession = useDeleteReadingSession();
  const {
    data, isLoading, error,
  } = useReadingSession(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Reading session not found.</p>;

  const remove = () => {
    deleteReadingSession.mutate(id, {
      onSuccess: () => navigate({
        to: "/reading-sessions",
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
            to="/reading-sessions/$id"
            params={{
              id,
            }}
          >
            <ArrowLeft className="size-4" />
            Back to reading session
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={deleteReadingSession.isPending}
          onClick={remove}
        >
          Delete
        </Button>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">
          Update the translation, corrections, or word notes.
        </p>
      </div>
      <ReadingSessionForm
        session={data}
        onSuccess={() =>
          navigate({
            to: "/reading-sessions/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}

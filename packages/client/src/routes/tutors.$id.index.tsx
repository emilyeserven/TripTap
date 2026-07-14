import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";

import { TutorView } from "@/components/TutorView";
import { Button } from "@/components/ui/button";
import { useDeleteTutor, useTutor } from "@/hooks/useTutors";

export const Route = createFileRoute("/tutors/$id/")({
  component: ViewTutorPage,
});

function ViewTutorPage() {
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const {
    data, isLoading, error,
  } = useTutor(id);
  const deleteTutor = useDeleteTutor();

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Tutor not found.</p>;

  const remove = () => {
    deleteTutor.mutate(id, {
      onSuccess: () =>
        navigate({
          to: "/tutors",
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
          <Link to="/tutors">
            <ArrowLeft className="size-4" />
            All tutors
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <Link
              to="/tutors/$id/edit"
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
            disabled={deleteTutor.isPending}
            onClick={remove}
          >
            Delete
          </Button>
        </div>
      </div>

      <TutorView tutor={data} />
    </section>
  );
}

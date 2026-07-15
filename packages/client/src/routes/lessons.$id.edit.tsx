import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { LessonForm } from "@/components/LessonForm";
import { LessonViewOptions } from "@/components/LessonViewOptions";
import { Button } from "@/components/ui/button";
import { useDeleteLesson, useLesson } from "@/hooks/useLessons";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/lessons/$id/edit")({
  component: EditLessonPage,
});

function EditLessonPage() {
  usePageTitle("Edit lesson");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const deleteLesson = useDeleteLesson();
  const {
    data, isLoading, error,
  } = useLesson(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Lesson not found.</p>;

  const remove = () => {
    deleteLesson.mutate(id, {
      onSuccess: () => navigate({
        to: "/lessons",
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
            to="/lessons/$id"
            params={{
              id,
            }}
          >
            <ArrowLeft className="size-4" />
            Done — back to lesson
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <LessonViewOptions />
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            disabled={deleteLesson.isPending}
            onClick={remove}
          >
            Delete
          </Button>
        </div>
      </div>
      <LessonForm lesson={data} />
    </section>
  );
}

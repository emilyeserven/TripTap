import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";

import { LessonMySentences } from "@/components/LessonMySentences";
import { LessonView } from "@/components/LessonView";
import { Button } from "@/components/ui/button";
import { useDeleteLesson, useLesson } from "@/hooks/useLessons";

export const Route = createFileRoute("/lessons/$id/")({
  component: ViewLessonPage,
});

function ViewLessonPage() {
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const {
    data, isLoading, error,
  } = useLesson(id);
  const deleteLesson = useDeleteLesson();

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Lesson not found.</p>;

  const remove = () => {
    deleteLesson.mutate(id, {
      onSuccess: () =>
        navigate({
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
          <Link to="/lessons">
            <ArrowLeft className="size-4" />
            All lessons
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <Link
              to="/lessons/$id/edit"
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
            disabled={deleteLesson.isPending}
            onClick={remove}
          >
            Delete
          </Button>
        </div>
      </div>

      <LessonView lesson={data} />

      <LessonMySentences
        lessonId={data.id}
        language={data.language}
      />
    </section>
  );
}

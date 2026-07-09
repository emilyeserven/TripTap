import { createFileRoute } from "@tanstack/react-router";

import { LessonTemplate } from "@/components/lesson/LessonTemplate";
import { useLesson } from "@/hooks/useLessons";

export const Route = createFileRoute("/lessons/$slug")({
  component: LessonViewer,
});

function LessonViewer() {
  const {
    slug,
  } = Route.useParams();
  const {
    data: lesson, isLoading, error,
  } = useLesson(slug);

  if (isLoading) return <p className="text-muted-foreground">Loading lesson…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!lesson) return <p className="text-muted-foreground">Lesson not found.</p>;

  return <LessonTemplate lesson={lesson} />;
}

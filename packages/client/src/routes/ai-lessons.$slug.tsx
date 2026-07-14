import { createFileRoute } from "@tanstack/react-router";

import { AiLessonTemplate } from "@/components/ai-lesson/AiLessonTemplate";
import { useAiLesson } from "@/hooks/useAiLessons";

export const Route = createFileRoute("/ai-lessons/$slug")({
  component: AiLessonViewer,
});

function AiLessonViewer() {
  const {
    slug,
  } = Route.useParams();
  const {
    data: aiLesson, isLoading, error,
  } = useAiLesson(slug);

  if (isLoading) return <p className="text-muted-foreground">Loading AI Lesson…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!aiLesson) return <p className="text-muted-foreground">AI Lesson not found.</p>;

  return <AiLessonTemplate aiLesson={aiLesson} />;
}

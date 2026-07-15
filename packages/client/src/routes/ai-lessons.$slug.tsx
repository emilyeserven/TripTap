import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { AiLessonTemplate } from "@/components/ai-lesson/AiLessonTemplate";
import { Button } from "@/components/ui/button";
import { useAiLesson, useDeleteAiLesson } from "@/hooks/useAiLessons";

export const Route = createFileRoute("/ai-lessons/$slug")({
  component: AiLessonViewer,
});

function AiLessonViewer() {
  const {
    slug,
  } = Route.useParams();
  const navigate = useNavigate();
  const deleteAiLesson = useDeleteAiLesson();
  const {
    data: aiLesson, isLoading, error,
  } = useAiLesson(slug);

  if (isLoading) return <p className="text-muted-foreground">Loading AI Lesson…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!aiLesson) return <p className="text-muted-foreground">AI Lesson not found.</p>;

  const remove = () => {
    deleteAiLesson.mutate(aiLesson.id, {
      onSuccess: () => navigate({
        to: "/ai-lessons",
      }),
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={deleteAiLesson.isPending}
          onClick={remove}
        >
          Delete
        </Button>
      </div>
      <AiLessonTemplate aiLesson={aiLesson} />
    </section>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { LessonForm } from "@/components/LessonForm";
import { Button } from "@/components/ui/button";
import { useLesson } from "@/hooks/useLessons";
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
  const {
    data, isLoading, error,
  } = useLesson(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Lesson not found.</p>;

  return (
    <section className="max-w-3xl space-y-6">
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
          Back to lesson
        </Link>
      </Button>
      <LessonForm
        lesson={data}
        onSuccess={() =>
          navigate({
            to: "/lessons/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}

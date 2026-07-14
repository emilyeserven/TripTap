import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { LessonForm } from "@/components/LessonForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/lessons/new")({
  component: NewLessonPage,
});

function NewLessonPage() {
  usePageTitle("New lesson");
  const navigate = useNavigate();

  return (
    <section className="max-w-3xl space-y-6">
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
      <div>
        <p className="text-sm text-muted-foreground">
          Record a tutoring lesson: set the date and tutor, log notes while listening, note the words
          that came up, and link any answer sheets you worked through.
        </p>
      </div>
      <LessonForm
        onSuccess={id =>
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

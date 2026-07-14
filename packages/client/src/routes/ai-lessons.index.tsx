import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAiLessons, useDeleteAiLesson } from "@/hooks/useAiLessons";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/ai-lessons/")({
  component: AiLessonsPage,
});

function AiLessonsPage() {
  usePageTitle("AI Lessons");
  const {
    data: aiLessons, isLoading, error,
  } = useAiLessons();
  const deleteAiLesson = useDeleteAiLesson();

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Study an AI Lesson, or create a new one.</p>
        </div>
        <Button asChild>
          <Link to="/ai-lessons/new">
            <Plus className="size-4" />
            New AI Lesson
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
        {error ? <p className="text-destructive">{error.message}</p> : null}
        {!isLoading && (aiLessons ?? []).length === 0
          ? (
            <p className="text-muted-foreground">
              No AI Lessons yet.
              {" "}
              <Link
                to="/ai-lessons/new"
                className="
                  text-primary
                  hover:underline
                "
              >Create one.
              </Link>
            </p>
          )
          : null}
        {(aiLessons ?? []).map(l => (
          <Card key={l.id}>
            <CardContent className="flex items-start justify-between gap-3 py-4">
              <div className="space-y-1">
                <Link
                  to="/ai-lessons/$slug"
                  params={{
                    slug: l.slug,
                  }}
                  className="
                    font-medium
                    hover:underline
                  "
                >
                  {l.title}
                </Link>
                <p className="text-sm text-muted-foreground">{l.subtitle}</p>
                <div
                  className="flex flex-wrap gap-3 text-xs text-muted-foreground"
                >
                  <span>{l.targetLevel}</span>
                  <span>{`${l.counts.vocab} vocab`}</span>
                  <span>{`${l.counts.grammar} grammar`}</span>
                  <span>{`${l.counts.source} sentences`}</span>
                  <span>{`${l.counts.culture} culture`}</span>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Delete ${l.title}`}
                onClick={() => deleteAiLesson.mutate(l.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

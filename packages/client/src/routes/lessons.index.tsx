import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDeleteLesson, useLessons } from "@/hooks/useLessons";

export const Route = createFileRoute("/lessons/")({
  component: LessonsPage,
});

function LessonsPage() {
  const {
    data: lessons, isLoading, error,
  } = useLessons();
  const deleteLesson = useDeleteLesson();

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Lessons</h1>
          <p className="text-sm text-muted-foreground">Study a lesson, or create a new one.</p>
        </div>
        <Button asChild>
          <Link to="/lessons/new">
            <Plus className="size-4" />
            New lesson
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
        {error ? <p className="text-destructive">{error.message}</p> : null}
        {!isLoading && (lessons ?? []).length === 0
          ? (
            <p className="text-muted-foreground">
              No lessons yet.
              {" "}
              <Link
                to="/lessons/new"
                className="
                  text-primary
                  hover:underline
                "
              >Create one.
              </Link>
            </p>
          )
          : null}
        {(lessons ?? []).map(l => (
          <Card key={l.id}>
            <CardContent className="flex items-start justify-between gap-3 py-4">
              <div className="space-y-1">
                <Link
                  to="/lessons/$slug"
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
                onClick={() => deleteLesson.mutate(l.id)}
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

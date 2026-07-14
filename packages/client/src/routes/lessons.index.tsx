import { useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { LessonCard } from "@/components/LessonCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDeleteLesson, useLessons } from "@/hooks/useLessons";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useTutors } from "@/hooks/useTutors";

const ALL = "__all";

export const Route = createFileRoute("/lessons/")({
  component: LessonsPage,
});

function LessonsPage() {
  usePageTitle("Lessons");
  const [tutorId, setTutorId] = useState<string | null>(null);
  const {
    data: lessons, isLoading, error,
  } = useLessons(tutorId ?? undefined);
  const deleteLesson = useDeleteLesson();
  const tutors = useTutors();
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (lessons ?? []).filter((l) => {
      if (!q) return true;
      return (l.title ?? "").toLowerCase().includes(q) || l.date.includes(q);
    });
  }, [lessons, search]);

  const nothing = !isLoading && shown.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            A record of your tutoring lessons: the date, the tutor, notes taken while listening, words
            you noted, and the answer sheets you worked through. Open one to review it.
          </p>
        </div>
        <Button asChild>
          <Link to="/lessons/new">
            <Plus className="size-4" />
            New lesson
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search lessons…"
          aria-label="Search lessons"
          className="max-w-sm"
        />
        <Select
          value={tutorId ?? ALL}
          onValueChange={next => setTutorId(next === ALL ? null : next)}
        >
          <SelectTrigger
            className="w-52"
            aria-label="Filter by tutor"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All tutors</SelectItem>
            {(tutors.data ?? []).map(t => (
              <SelectItem
                key={t.id}
                value={t.id}
              >
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {nothing
        ? (
          <p className="text-muted-foreground">
            No lessons yet. Create one with “New lesson”.
          </p>
        )
        : null}

      <div className="space-y-4">
        {shown.map(lesson => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            onDelete={id => deleteLesson.mutate(id)}
          />
        ))}
      </div>
    </section>
  );
}

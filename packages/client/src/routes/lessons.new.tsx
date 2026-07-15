import { useState } from "react";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateLesson } from "@/hooks/useLessons";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/lessons/new")({
  component: NewLessonPage,
});

/** Today as a "YYYY-MM-DD" string (local time) for the default lesson date. */
function todayIso(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

/**
 * Minimal create step: a lesson is created immediately (so it gets an id) with just a date, then the
 * learner is dropped into the autosaving editor to fill in everything else.
 */
function NewLessonPage() {
  usePageTitle("New lesson");
  const navigate = useNavigate();
  const create = useCreateLesson();
  const [date, setDate] = useState(todayIso());

  const submit = async () => {
    if (!date || create.isPending) return;
    const saved = await create.mutateAsync({
      date,
    });
    navigate({
      to: "/lessons/$id/edit",
      params: {
        id: saved.id,
      },
    });
  };

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
          Pick the date to start a lesson — you can fill in the tutor, notes, and everything else next,
          and it all saves automatically.
        </p>
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="new-lesson-date">Date</Label>
          <Input
            id="new-lesson-date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-52"
          />
        </div>
        <Button
          type="submit"
          disabled={!date || create.isPending}
        >
          {create.isPending ? "Creating…" : "Create lesson"}
        </Button>
      </form>
    </section>
  );
}

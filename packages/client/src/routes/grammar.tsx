import { useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { GrammarItemRow } from "@/components/lesson/GrammarItemRow";
import { LessonFilterChips } from "@/components/lesson/lesson-filter";
import { uniqueLessons } from "@/components/lesson/lesson-filter-utils";
import { Accordion } from "@/components/ui/accordion";
import { useLessonContent } from "@/hooks/useLessons";

export const Route = createFileRoute("/grammar")({
  component: GrammarPage,
});

function GrammarPage() {
  const {
    data, isLoading, error,
  } = useLessonContent();
  const [lesson, setLesson] = useState("all");

  const items = useMemo(() => data?.grammar ?? [], [data]);
  const lessons = useMemo(() => uniqueLessons(items), [items]);
  const filtered = lesson === "all" ? items : items.filter(g => g.lessonSlug === lesson);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Grammar</h1>
        <p className="text-sm text-muted-foreground">{`${items.length} patterns across your lessons.`}</p>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-destructive">{error.message}</p> : null}
      <LessonFilterChips
        lessons={lessons}
        value={lesson}
        onChange={setLesson}
      />
      <Accordion
        type="single"
        collapsible
        className="w-full"
      >
        {filtered.map(g => (
          <GrammarItemRow
            key={g.id}
            grammar={g}
            lesson={{
              slug: g.lessonSlug,
              title: g.lessonTitle,
            }}
          />
        ))}
      </Accordion>
      {!isLoading && items.length === 0
        ? <p className="text-muted-foreground">No grammar yet. Import a lesson.</p>
        : null}
    </section>
  );
}

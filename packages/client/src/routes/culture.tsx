import { useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { CultureCard } from "@/components/lesson/CultureCard";
import { FuriganaScope } from "@/components/lesson/FuriganaScope";
import { FuriganaToggle } from "@/components/lesson/FuriganaToggle";
import { LessonFilterChips } from "@/components/lesson/lesson-filter";
import { uniqueLessons } from "@/components/lesson/lesson-filter-utils";
import { VocabMapContext } from "@/components/lesson/vocab-map-context";
import { useLessonContent } from "@/hooks/useLessons";

export const Route = createFileRoute("/culture")({
  component: CulturePage,
});

function CulturePage() {
  const {
    data, isLoading, error,
  } = useLessonContent();
  const [lesson, setLesson] = useState("all");

  const items = useMemo(() => data?.culture ?? [], [data]);
  const lessons = useMemo(() => uniqueLessons(items), [items]);
  // Union of all lessons' vocab so culture-note term chips resolve on hover.
  const vocabMap = useMemo(
    () => Object.fromEntries((data?.vocab ?? []).map(v => [v.jp, v])),
    [data],
  );
  const filtered = lesson === "all" ? items : items.filter(c => c.lessonSlug === lesson);

  return (
    <FuriganaScope>
      <VocabMapContext.Provider value={vocabMap}>
        <section className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Culture</h1>
              <p className="text-sm text-muted-foreground">{`${items.length} notes across your lessons.`}</p>
            </div>
            <FuriganaToggle />
          </div>
          {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
          {error ? <p className="text-destructive">{error.message}</p> : null}
          <LessonFilterChips
            lessons={lessons}
            value={lesson}
            onChange={setLesson}
          />
          <div
            className="
              grid gap-4
              sm:grid-cols-2
            "
          >
            {filtered.map(c => (
              <CultureCard
                key={c.id}
                culture={c}
                lesson={{
                  slug: c.lessonSlug,
                  title: c.lessonTitle,
                }}
              />
            ))}
          </div>
          {!isLoading && items.length === 0
            ? <p className="text-muted-foreground">No culture notes yet. Import a lesson.</p>
            : null}
        </section>
      </VocabMapContext.Provider>
    </FuriganaScope>
  );
}

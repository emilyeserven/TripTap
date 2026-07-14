import { useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { AiLessonFilterChips } from "@/components/ai-lesson/ai-lesson-filter";
import { uniqueAiLessons } from "@/components/ai-lesson/ai-lesson-filter-utils";
import { CultureCard } from "@/components/ai-lesson/CultureCard";
import { FuriganaScope } from "@/components/ai-lesson/FuriganaScope";
import { FuriganaToggle } from "@/components/ai-lesson/FuriganaToggle";
import { VocabMapContext } from "@/components/ai-lesson/vocab-map-context";
import { useAiLessonContent } from "@/hooks/useAiLessons";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/culture")({
  component: CulturePage,
});

function CulturePage() {
  usePageTitle("Culture");
  const {
    data, isLoading, error,
  } = useAiLessonContent();
  const [aiLesson, setAiLesson] = useState("all");

  const items = useMemo(() => data?.culture ?? [], [data]);
  const aiLessons = useMemo(() => uniqueAiLessons(items), [items]);
  // Union of all AI Lessons' vocab so culture-note term chips resolve on hover.
  const vocabMap = useMemo(
    () => Object.fromEntries((data?.vocab ?? []).map(v => [v.jp, v])),
    [data],
  );
  const filtered = aiLesson === "all" ? items : items.filter(c => c.aiLessonSlug === aiLesson);

  return (
    <FuriganaScope>
      <VocabMapContext.Provider value={vocabMap}>
        <section className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{`${items.length} notes across your AI Lessons.`}</p>
            </div>
            <FuriganaToggle />
          </div>
          {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
          {error ? <p className="text-destructive">{error.message}</p> : null}
          <AiLessonFilterChips
            aiLessons={aiLessons}
            value={aiLesson}
            onChange={setAiLesson}
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
                aiLesson={{
                  slug: c.aiLessonSlug,
                  title: c.aiLessonTitle,
                }}
              />
            ))}
          </div>
          {!isLoading && items.length === 0
            ? <p className="text-muted-foreground">No culture notes yet. Import an AI Lesson.</p>
            : null}
        </section>
      </VocabMapContext.Provider>
    </FuriganaScope>
  );
}

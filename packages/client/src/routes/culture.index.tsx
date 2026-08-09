import type { CultureFilters } from "@/lib/culture-filter";

import { useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Tags } from "lucide-react";

import { AiLessonFilterChips } from "@/components/ai-lesson/ai-lesson-filter";
import { uniqueAiLessons } from "@/components/ai-lesson/ai-lesson-filter-utils";
import { CultureCard } from "@/components/ai-lesson/CultureCard";
import { FuriganaScope } from "@/components/ai-lesson/FuriganaScope";
import { FuriganaToggle } from "@/components/ai-lesson/FuriganaToggle";
import { VocabMapContext } from "@/components/ai-lesson/vocab-map-context";
import { CultureNoteCard } from "@/components/CultureNoteCard";
import { CultureTopicsEditor } from "@/components/CultureTopicsEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAiLessonContent } from "@/hooks/useAiLessons";
import { useCultureNotes } from "@/hooks/useCultureNotes";
import { useCultureTopics } from "@/hooks/useCultureTopics";
import { usePageTitle } from "@/hooks/usePageTitle";
import { filterAiLessonCulture, filterCultureNotes } from "@/lib/culture-filter";

export const Route = createFileRoute("/culture/")({
  component: CulturePage,
});

const DEFAULT_FILTERS: CultureFilters = {
  search: "",
  scope: "all",
  aiLesson: "all",
  topic: "all",
};

function CulturePage() {
  usePageTitle("Culture");
  const {
    data, isLoading, error,
  } = useAiLessonContent();
  const {
    data: noteData,
  } = useCultureNotes();
  const {
    data: topics,
  } = useCultureTopics();

  const items = useMemo(() => data?.culture ?? [], [data]);
  const notes = useMemo(() => noteData ?? [], [noteData]);
  const aiLessons = useMemo(() => uniqueAiLessons(items), [items]);
  const topicsById = useMemo(
    () => Object.fromEntries((topics ?? []).map(t => [t.id, t.name])),
    [topics],
  );
  // Union of all AI Lessons' vocab so culture-note term chips resolve on hover.
  const vocabMap = useMemo(
    () => Object.fromEntries((data?.vocab ?? []).map(v => [v.jp, v])),
    [data],
  );

  const [filters, setFilters] = useState<CultureFilters>(DEFAULT_FILTERS);
  const patchFilters = (patch: Partial<CultureFilters>) =>
    setFilters(f => ({
      ...f,
      ...patch,
    }));

  const notesShown = filterCultureNotes(notes, filters);
  const aiLessonShown = filterAiLessonCulture(items, filters);

  const shownCount = notesShown.length + aiLessonShown.length;
  const totalCount = notes.length + items.length;
  const nothing = !isLoading && shownCount === 0;

  return (
    <FuriganaScope>
      <VocabMapContext.Provider value={vocabMap}>
        <section className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {`Your own notes and those from AI Lessons — ${shownCount} of ${totalCount}.`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <FuriganaToggle />
              <Button
                asChild
                variant="ghost"
                size="sm"
              >
                <Link to="/culture/topics">
                  <Tags className="size-4" />
                  Topics
                </Link>
              </Button>
              <Button asChild>
                <Link to="/culture/new">
                  <Plus className="size-4" />
                  New note
                </Link>
              </Button>
            </div>
          </div>

          <Input
            value={filters.search}
            onChange={e => patchFilters({
              search: e.target.value,
            })}
            placeholder="Search headings and bodies…"
            aria-label="Search culture notes"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filters.scope}
              onValueChange={scope => patchFilters({
                scope,
              })}
            >
              <SelectTrigger
                className="w-40"
                aria-label="Culture scope"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All notes</SelectItem>
                <SelectItem value="yours">Yours</SelectItem>
                <SelectItem value="lessons">From AI Lessons</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.topic}
              onValueChange={topic => patchFilters({
                topic,
              })}
            >
              <SelectTrigger
                className="w-40"
                aria-label="Topic"
              >
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All topics</SelectItem>
                {(topics ?? []).map(t => (
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

          {filters.scope !== "yours" && (
            <AiLessonFilterChips
              aiLessons={aiLessons}
              value={filters.aiLesson}
              onChange={aiLesson => patchFilters({
                aiLesson,
              })}
            />
          )}

          {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
          {error ? <p className="text-destructive">{error.message}</p> : null}
          <div
            className="
              grid gap-4
              sm:grid-cols-2
            "
          >
            {notesShown.map(n => (
              <CultureNoteCard
                key={n.id}
                note={n}
                topicsById={topicsById}
              />
            ))}
            {aiLessonShown.map(c => (
              <CultureCard
                key={c.id}
                culture={c}
                aiLesson={{
                  slug: c.aiLessonSlug,
                  title: c.aiLessonTitle,
                }}
                footer={(
                  <CultureTopicsEditor
                    cultureId={c.id}
                    topicIds={c.topicIds}
                  />
                )}
              />
            ))}
          </div>
          {nothing
            ? (
              <p className="text-muted-foreground">
                No culture notes yet. Write one, or import an AI Lesson.
              </p>
            )
            : null}
        </section>
      </VocabMapContext.Provider>
    </FuriganaScope>
  );
}

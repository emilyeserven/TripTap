import type { LinkedSentence } from "@/lib/grammar-links";

import { useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { GrammarItemRow } from "@/components/lesson/GrammarItemRow";
import { LessonFilterChips } from "@/components/lesson/lesson-filter";
import { uniqueLessons } from "@/components/lesson/lesson-filter-utils";
import { Accordion } from "@/components/ui/accordion";
import { Combobox } from "@/components/ui/combobox";
import { useLessonContent } from "@/hooks/useLessons";
import { useSentences } from "@/hooks/useSentences";
import { dedupeGrammarTags, sentencesByGrammarTagId } from "@/lib/grammar-links";

export const Route = createFileRoute("/grammar")({
  component: GrammarPage,
});

function GrammarPage() {
  const {
    data, isLoading, error,
  } = useLessonContent();
  const {
    data: manualSentences,
  } = useSentences();
  const [lesson, setLesson] = useState("all");
  const [grammarTag, setGrammarTag] = useState("all");

  const items = useMemo(() => data?.grammar ?? [], [data]);
  const lessons = useMemo(() => uniqueLessons(items), [items]);

  // Filter options: every Grammar source tag currently associated with a grammar item.
  const tagOptions = useMemo(() => {
    const tags = dedupeGrammarTags(items.flatMap(g => g.grammarTerms ?? []));
    return [
      {
        value: "all",
        label: "All grammar tags",
      },
      ...tags.map(t => ({
        value: t.id,
        label: t.name,
      })),
    ];
  }, [items]);

  // Cross-link: grammar-tag id → sentences (manual + lesson-mined) that carry the same tag.
  const linkMap = useMemo(
    () => sentencesByGrammarTagId(manualSentences ?? [], data?.sentences ?? []),
    [manualSentences, data],
  );

  const filtered = items.filter((g) => {
    if (lesson !== "all" && g.lessonSlug !== lesson) return false;
    if (grammarTag !== "all" && !(g.grammarTerms ?? []).some(t => t.id === grammarTag)) return false;
    return true;
  });

  // A grammar item's linked sentences, deduped by id (a sentence may carry several of its tags).
  const linkedFor = (tagIds: string[]): LinkedSentence[] => {
    const seen = new Map<string, LinkedSentence>();
    for (const id of tagIds) {
      for (const s of linkMap.get(id) ?? []) if (!seen.has(s.id)) seen.set(s.id, s);
    }
    return [...seen.values()];
  };

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Grammar</h1>
        <p className="text-sm text-muted-foreground">{`${items.length} patterns across your lessons.`}</p>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-destructive">{error.message}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <LessonFilterChips
          lessons={lessons}
          value={lesson}
          onChange={setLesson}
        />
        {tagOptions.length > 1
          ? (
            <Combobox
              value={grammarTag}
              onChange={setGrammarTag}
              options={tagOptions}
              ariaLabel="Filter by grammar tag"
              searchPlaceholder="Search grammar tags…"
              className="w-52"
            />
          )
          : null}
      </div>
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
            onTagClick={setGrammarTag}
            linkedSentences={linkedFor((g.grammarTerms ?? []).map(t => t.id))}
          />
        ))}
      </Accordion>
      {!isLoading && items.length === 0
        ? <p className="text-muted-foreground">No grammar yet. Import a lesson.</p>
        : null}
    </section>
  );
}

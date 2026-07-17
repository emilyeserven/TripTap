import type { LinkedSentence } from "@/lib/grammar-links";

import { useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { AiLessonFilterChips } from "@/components/ai-lesson/ai-lesson-filter";
import { uniqueAiLessons } from "@/components/ai-lesson/ai-lesson-filter-utils";
import { GrammarItemRow } from "@/components/ai-lesson/GrammarItemRow";
import { Accordion } from "@/components/ui/accordion";
import { Combobox } from "@/components/ui/combobox";
import { useAiLessonContent } from "@/hooks/useAiLessons";
import { useGrammarNotes } from "@/hooks/useGrammarNotes";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSentences } from "@/hooks/useSentences";
import { dedupeGrammarTags, sentencesByGrammarTagId } from "@/lib/grammar-links";
import { notesByTagId } from "@/lib/grammar-notes";

export const Route = createFileRoute("/grammar")({
  component: GrammarPage,
});

function GrammarPage() {
  usePageTitle("Grammar");
  const {
    data, isLoading, error,
  } = useAiLessonContent();
  const {
    data: manualSentences,
  } = useSentences();
  const {
    data: grammarNotes,
  } = useGrammarNotes();
  const [aiLesson, setAiLesson] = useState("all");
  const [grammarTag, setGrammarTag] = useState("all");

  // A grammar item's tags → an existing note to open, or the first tag to start one from.
  const noteByTag = useMemo(() => notesByTagId(grammarNotes ?? []), [grammarNotes]);
  const noteLinkFor = (terms: { id: string;
    name: string; }[]) => {
    for (const t of terms) {
      const existing = noteByTag.get(t.id);
      if (existing) return {
        noteId: existing.id,
      };
    }
    const first = terms[0];
    return first
      ? {
        createTag: {
          id: first.id,
          name: first.name,
        },
      }
      : null;
  };

  const items = useMemo(() => data?.grammar ?? [], [data]);
  const aiLessons = useMemo(() => uniqueAiLessons(items), [items]);

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

  // Cross-link: grammar-tag id → sentences (manual + AI-Lesson-mined) that carry the same tag.
  const linkMap = useMemo(
    () => sentencesByGrammarTagId(manualSentences ?? [], data?.sentences ?? []),
    [manualSentences, data],
  );

  const filtered = items.filter((g) => {
    if (aiLesson !== "all" && g.aiLessonSlug !== aiLesson) return false;
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
        <p className="text-sm text-muted-foreground">{`${items.length} patterns across your AI Lessons.`}</p>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-destructive">{error.message}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <AiLessonFilterChips
          aiLessons={aiLessons}
          value={aiLesson}
          onChange={setAiLesson}
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
            aiLesson={{
              slug: g.aiLessonSlug,
              title: g.aiLessonTitle,
            }}
            onTagClick={setGrammarTag}
            linkedSentences={linkedFor((g.grammarTerms ?? []).map(t => t.id))}
            noteLink={noteLinkFor(g.grammarTerms ?? [])}
          />
        ))}
      </Accordion>
      {!isLoading && items.length === 0
        ? <p className="text-muted-foreground">No grammar yet. Import an AI Lesson.</p>
        : null}
    </section>
  );
}

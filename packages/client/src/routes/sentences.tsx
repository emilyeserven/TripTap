import { useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { uniqueAiLessons } from "@/components/ai-lesson/ai-lesson-filter-utils";
import { FuriganaScope } from "@/components/ai-lesson/FuriganaScope";
import { FuriganaToggle } from "@/components/ai-lesson/FuriganaToggle";
import { matches } from "@/components/ai-lesson/search";
import { SourceCard } from "@/components/ai-lesson/SourceCard";
import { SentenceCard } from "@/components/SentenceCard";
import { SentenceForm } from "@/components/SentenceForm";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAiLessonContent } from "@/hooks/useAiLessons";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBackfillFurigana, useDeleteSentence, useSentences } from "@/hooks/useSentences";
import { useSources } from "@/hooks/useSources";
import { dedupeGrammarTags, grammarTermsOf } from "@/lib/grammar-links";
import { useUiStore } from "@/stores/uiStore";

export const Route = createFileRoute("/sentences")({
  component: SentencesPage,
  validateSearch: (search: Record<string, unknown>): { source?: string } => ({
    source: typeof search.source === "string" ? search.source : undefined,
  }),
});

function SentencesPage() {
  usePageTitle("Sentences");
  const {
    data: sentences, isLoading, error,
  } = useSentences();
  const deleteSentence = useDeleteSentence();
  const backfillFurigana = useBackfillFurigana();
  const {
    data: sources,
  } = useSources();
  const sourceName = (id: string | null) =>
    (id ? sources?.find(s => s.id === id)?.name ?? null : null);
  const showTranslations = useUiStore(s => s.showTranslations);
  const toggleShowTranslations = useUiStore(s => s.toggleShowTranslations);

  const {
    data: content,
  } = useAiLessonContent();
  const aiLessonSentences = useMemo(() => content?.sentences ?? [], [content]);
  const aiLessons = useMemo(() => uniqueAiLessons(aiLessonSentences), [aiLessonSentences]);

  const {
    source: sourceParam,
  } = Route.useSearch();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // "all" | "mine" | AI Lesson slug
  const [sourceFilter, setSourceFilter] = useState(sourceParam ?? "all");
  const [grammarTag, setGrammarTag] = useState("all"); // "all" | grammar-tag id

  const manual = sentences ?? [];

  // Grammar-tag filter options: every Grammar source tag in use across manual + AI Lesson sentences.
  const grammarTagOptions = useMemo(() => {
    const tags = dedupeGrammarTags([
      ...manual.flatMap(grammarTermsOf),
      ...aiLessonSentences.flatMap(s => s.grammarTerms ?? []),
    ]);
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
  }, [manual, aiLessonSentences]);

  const aiLessonOptions = useMemo(() => {
    const opts = [{
      value: "all",
      label: "All AI Lessons",
    }];
    if (manual.length > 0) {
      opts.push({
        value: "mine",
        label: "Yours",
      });
    }
    for (const l of aiLessons) {
      opts.push({
        value: l.slug,
        label: l.title,
      });
    }
    return opts;
  }, [manual.length, aiLessons]);

  const sourceOptions = useMemo(() => [
    {
      value: "all",
      label: "All sources",
    },
    ...(sources ?? []).map(s => ({
      value: s.id,
      label: s.name,
    })),
  ], [sources]);

  const bySource = (id: string | null) => sourceFilter === "all" || id === sourceFilter;
  const byGrammarTag = (terms: { id: string }[]) =>
    grammarTag === "all" || terms.some(t => t.id === grammarTag);
  const manualShown = filter === "all" || filter === "mine"
    ? manual.filter(s =>
      bySource(s.sourceId)
      && byGrammarTag(grammarTermsOf(s))
      && matches(search, s.text, s.translation, s.source, s.tags, s.notes))
    : [];
  // AI-Lesson-mined sentences carry no source, so a specific source filter hides them.
  const aiLessonShown = (sourceFilter !== "all"
    ? []
    : filter === "mine"
      ? []
      : filter === "all" ? aiLessonSentences : aiLessonSentences.filter(s => s.aiLessonSlug === filter))
    .filter(s => byGrammarTag(s.grammarTerms ?? []) && matches(search, s.jp, s.en, s.where));

  const nothing = !isLoading && manualShown.length === 0 && aiLessonShown.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Your own sentences and those mined from AI Lessons.</p>
        </div>
        <div className="flex items-center gap-4">
          <label
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <input
              type="checkbox"
              checked={showTranslations}
              onChange={toggleShowTranslations}
            />
            Show translations
          </label>
          <FuriganaToggle />
          <Button
            variant="outline"
            onClick={() => backfillFurigana.mutate()}
            disabled={backfillFurigana.isPending}
            title="Generate furigana for sentences that don't have it yet"
          >
            {backfillFurigana.isPending
              ? "Generating…"
              : backfillFurigana.data
                ? `Furigana +${backfillFurigana.data.updated}`
                : "Generate furigana"}
          </Button>
          <Dialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                New sentence
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>New sentence</DialogTitle>
              </DialogHeader>
              <SentenceForm onSuccess={() => setDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search sentences…"
        aria-label="Search sentences"
      />

      <div className="flex flex-wrap items-center gap-2">
        {aiLessonOptions.length > 1
          ? (
            <Combobox
              value={filter}
              onChange={setFilter}
              options={aiLessonOptions}
              ariaLabel="Filter by AI Lesson"
              searchPlaceholder="Search AI Lessons…"
              className="w-52"
            />
          )
          : null}
        <Combobox
          value={sourceFilter}
          onChange={setSourceFilter}
          options={sourceOptions}
          ariaLabel="Filter by source"
          searchPlaceholder="Search sources…"
          className="w-52"
        />
        {grammarTagOptions.length > 1
          ? (
            <Combobox
              value={grammarTag}
              onChange={setGrammarTag}
              options={grammarTagOptions}
              ariaLabel="Filter by grammar tag"
              searchPlaceholder="Search grammar tags…"
              className="w-52"
            />
          )
          : null}
      </div>

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {nothing ? <p className="text-muted-foreground">No matching sentences.</p> : null}

      <FuriganaScope>
        <div className="space-y-4">
          {manualShown.map(s => (
            <SentenceCard
              key={s.id}
              sentence={s}
              showTranslation={showTranslations}
              sourceName={sourceName(s.sourceId)}
              onDelete={id => deleteSentence.mutate(id)}
              onGrammarTagClick={setGrammarTag}
            />
          ))}
          {aiLessonShown.map(s => (
            <SourceCard
              key={s.id}
              sentence={s}
              aiLesson={{
                slug: s.aiLessonSlug,
                title: s.aiLessonTitle,
              }}
              onTagClick={setGrammarTag}
            />
          ))}
        </div>
      </FuriganaScope>
    </section>
  );
}

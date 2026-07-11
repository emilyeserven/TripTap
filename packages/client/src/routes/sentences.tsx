import { useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { FuriganaScope } from "@/components/lesson/FuriganaScope";
import { FuriganaToggle } from "@/components/lesson/FuriganaToggle";
import { LessonFilterChips } from "@/components/lesson/lesson-filter";
import { uniqueLessons } from "@/components/lesson/lesson-filter-utils";
import { matches } from "@/components/lesson/search";
import { SourceCard } from "@/components/lesson/SourceCard";
import { SentenceCard } from "@/components/SentenceCard";
import { SentenceForm } from "@/components/SentenceForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLessonContent } from "@/hooks/useLessons";
import { useDeleteSentence, useSentences } from "@/hooks/useSentences";
import { useSources } from "@/hooks/useSources";
import { useUiStore } from "@/stores/uiStore";

export const Route = createFileRoute("/sentences")({
  component: SentencesPage,
});

function SentencesPage() {
  const {
    data: sentences, isLoading, error,
  } = useSentences();
  const deleteSentence = useDeleteSentence();
  const {
    data: sources,
  } = useSources();
  const sourceName = (id: string | null) =>
    (id ? sources?.find(s => s.id === id)?.name ?? null : null);
  const showTranslations = useUiStore(s => s.showTranslations);
  const toggleShowTranslations = useUiStore(s => s.toggleShowTranslations);

  const {
    data: content,
  } = useLessonContent();
  const lessonSentences = useMemo(() => content?.sentences ?? [], [content]);
  const lessons = useMemo(() => uniqueLessons(lessonSentences), [lessonSentences]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // "all" | "mine" | lesson slug

  const manual = sentences ?? [];
  const manualShown = filter === "all" || filter === "mine"
    ? manual.filter(s => matches(search, s.text, s.translation, s.source, s.tags, s.notes))
    : [];
  const lessonShown = (filter === "mine"
    ? []
    : filter === "all" ? lessonSentences : lessonSentences.filter(s => s.lessonSlug === filter))
    .filter(s => matches(search, s.jp, s.en, s.where));

  const nothing = !isLoading && manualShown.length === 0 && lessonShown.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sentences</h1>
          <p className="text-sm text-muted-foreground">Your own sentences and those mined from lessons.</p>
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

      <LessonFilterChips
        lessons={lessons}
        value={filter}
        onChange={setFilter}
        extra={manual.length > 0
          ? [{
            value: "mine",
            label: "Yours",
          }]
          : undefined}
      />

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
            />
          ))}
          {lessonShown.map(s => (
            <SourceCard
              key={s.id}
              sentence={s}
              lesson={{
                slug: s.lessonSlug,
                title: s.lessonTitle,
              }}
            />
          ))}
        </div>
      </FuriganaScope>
    </section>
  );
}

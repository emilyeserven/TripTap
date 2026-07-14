import { useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { AiLessonFilterChips } from "@/components/ai-lesson/ai-lesson-filter";
import { uniqueAiLessons } from "@/components/ai-lesson/ai-lesson-filter-utils";
import { FuriganaScope } from "@/components/ai-lesson/FuriganaScope";
import { FuriganaToggle } from "@/components/ai-lesson/FuriganaToggle";
import { matches, sortLevels } from "@/components/ai-lesson/search";
import { VocabCard } from "@/components/ai-lesson/VocabCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VocabBankCard } from "@/components/VocabBankCard";
import { VocabForm } from "@/components/VocabForm";
import { useAiLessonContent, useUpdateVocabRenshuu } from "@/hooks/useAiLessons";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSources } from "@/hooks/useSources";
import { useDeleteVocab, useVocab } from "@/hooks/useVocab";

export const Route = createFileRoute("/vocabulary")({
  component: VocabularyPage,
});

function VocabularyPage() {
  usePageTitle("Vocabulary");
  const {
    data, isLoading, error,
  } = useAiLessonContent();
  const updateVocab = useUpdateVocabRenshuu();

  const {
    data: standalone,
  } = useVocab();
  const {
    data: sources,
  } = useSources();
  const deleteVocab = useDeleteVocab();
  const sourceName = (id: string | null) =>
    (id ? sources?.find(s => s.id === id)?.name ?? null : null);

  const items = useMemo(() => data?.vocab ?? [], [data]);
  const bank = useMemo(() => standalone ?? [], [standalone]);
  const aiLessons = useMemo(() => uniqueAiLessons(items), [items]);
  const levels = useMemo(() => sortLevels(items.map(v => v.lvl)), [items]);
  const categories = useMemo(() => [...new Set(items.map(v => v.cat))].sort(), [items]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("all"); // "all" | "yours" | "lessons"
  const [aiLesson, setAiLesson] = useState("all");
  const [level, setLevel] = useState("all");
  const [category, setCategory] = useState("all");
  const [renshuu, setRenshuu] = useState("all");

  // An AI-Lesson-specific refinement hides the standalone bank (it carries no lesson/level/category).
  const noAiLessonNarrowing
    = aiLesson === "all" && level === "all" && category === "all" && renshuu === "all";

  const bankShown = scope !== "lessons" && (scope === "yours" || noAiLessonNarrowing)
    ? bank.filter(v => matches(search, v.term, v.reading, v.meaning, v.tags, v.notes))
    : [];

  const aiLessonShown = scope !== "yours"
    ? items.filter(v =>
      (aiLesson === "all" || v.aiLessonSlug === aiLesson)
      && (level === "all" || v.lvl === level)
      && (category === "all" || v.cat === category)
      && (renshuu === "all" || (renshuu === "in" ? v.renshuuAdded : !v.renshuuAdded))
      && matches(search, v.jp, v.yomi, v.en))
    : [];

  const shownCount = bankShown.length + aiLessonShown.length;
  const totalCount = bank.length + items.length;
  const nothing = !isLoading && shownCount === 0;

  return (
    <FuriganaScope>
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {`Your own words and those mined from AI Lessons — ${shownCount} of ${totalCount}.`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <FuriganaToggle />
            <Dialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  New vocab
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>New vocab</DialogTitle>
                </DialogHeader>
                <VocabForm onSuccess={() => setDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search words, readings, meanings…"
          aria-label="Search vocabulary"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={scope}
            onValueChange={setScope}
          >
            <SelectTrigger
              className="w-40"
              aria-label="Vocab scope"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vocab</SelectItem>
              <SelectItem value="yours">Yours</SelectItem>
              <SelectItem value="lessons">From AI Lessons</SelectItem>
            </SelectContent>
          </Select>
          <FilterSelect
            value={level}
            onChange={setLevel}
            placeholder="Level"
            allLabel="All levels"
            options={levels}
          />
          <FilterSelect
            value={category}
            onChange={setCategory}
            placeholder="Category"
            allLabel="All categories"
            options={categories}
          />
          <Select
            value={renshuu}
            onValueChange={setRenshuu}
          >
            <SelectTrigger
              className="w-40"
              aria-label="Renshuu status"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Renshuu</SelectItem>
              <SelectItem value="in">In Renshuu</SelectItem>
              <SelectItem value="not">Not in Renshuu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {scope !== "yours" && (
          <AiLessonFilterChips
            aiLessons={aiLessons}
            value={aiLesson}
            onChange={setAiLesson}
          />
        )}

        {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
        {error ? <p className="text-destructive">{error.message}</p> : null}
        <div
          className="
            grid gap-3
            sm:grid-cols-2
            lg:grid-cols-3
          "
        >
          {bankShown.map(v => (
            <VocabBankCard
              key={v.id}
              vocab={v}
              sourceName={sourceName(v.sourceId)}
              onDelete={id => deleteVocab.mutate(id)}
            />
          ))}
          {aiLessonShown.map(v => (
            <VocabCard
              key={v.id}
              vocab={v}
              aiLesson={{
                slug: v.aiLessonSlug,
                title: v.aiLessonTitle,
              }}
              onRenshuuChange={patch => updateVocab.mutate({
                id: v.id,
                patch,
              })}
            />
          ))}
        </div>
        {nothing
          ? <p className="text-muted-foreground">No matching vocabulary.</p>
          : null}
      </section>
    </FuriganaScope>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  allLabel,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  allLabel: string;
  options: string[];
}) {
  return (
    <Select
      value={value}
      onValueChange={onChange}
    >
      <SelectTrigger
        className="w-40"
        aria-label={placeholder}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map(o => (
          <SelectItem
            key={o}
            value={o}
          >{o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

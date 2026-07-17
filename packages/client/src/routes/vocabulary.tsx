import type { VocabFilters } from "@/lib/vocab-filter";

import { useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { AiLessonFilterChips } from "@/components/ai-lesson/ai-lesson-filter";
import { uniqueAiLessons } from "@/components/ai-lesson/ai-lesson-filter-utils";
import { FuriganaScope } from "@/components/ai-lesson/FuriganaScope";
import { FuriganaToggle } from "@/components/ai-lesson/FuriganaToggle";
import { sortLevels } from "@/components/ai-lesson/search";
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
import { VocabBankCard } from "@/components/VocabBankCard";
import { VocabFilterBar } from "@/components/VocabFilterBar";
import { VocabForm } from "@/components/VocabForm";
import { useAiLessonContent, useUpdateVocabRenshuu } from "@/hooks/useAiLessons";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSources } from "@/hooks/useSources";
import { useDeleteVocab, useVocab } from "@/hooks/useVocab";
import { filterAiLessonVocab, filterBankVocab } from "@/lib/vocab-filter";

export const Route = createFileRoute("/vocabulary")({
  component: VocabularyPage,
});

const DEFAULT_FILTERS: VocabFilters = {
  search: "",
  scope: "all",
  aiLesson: "all",
  level: "all",
  category: "all",
  renshuu: "all",
};

function VocabularyPage() {
  usePageTitle("Vocabulary");
  const {
    data, isLoading, error,
  } = useAiLessonContent();
  const updateVocab = useUpdateVocabRenshuu();

  const {
    data: standalone,
  } = useVocab();
  const deleteVocab = useDeleteVocab();
  const {
    data: sources,
  } = useSources();
  const sourceName = (id: string | null) =>
    (id ? sources?.find(s => s.id === id)?.name ?? null : null);

  const items = useMemo(() => data?.vocab ?? [], [data]);
  const bank = useMemo(() => standalone ?? [], [standalone]);
  const aiLessons = useMemo(() => uniqueAiLessons(items), [items]);
  const levels = useMemo(() => sortLevels(items.map(v => v.lvl)), [items]);
  const categories = useMemo(() => [...new Set(items.map(v => v.cat))].sort(), [items]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState<VocabFilters>(DEFAULT_FILTERS);
  const patchFilters = (patch: Partial<VocabFilters>) =>
    setFilters(f => ({
      ...f,
      ...patch,
    }));

  const bankShown = filterBankVocab(bank, filters);
  const aiLessonShown = filterAiLessonVocab(items, filters);

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
          value={filters.search}
          onChange={e => patchFilters({
            search: e.target.value,
          })}
          placeholder="Search words, readings, meanings…"
          aria-label="Search vocabulary"
        />

        <VocabFilterBar
          filters={filters}
          onPatch={patchFilters}
          levels={levels}
          categories={categories}
        />

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
              onDelete={(id) => {
                if (globalThis.confirm("Delete this vocab entry?")) deleteVocab.mutate(id);
              }}
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

import { useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { PracticeSentenceCard } from "@/components/PracticeSentenceCard";
import { PracticeSentenceImportDialog } from "@/components/PracticeSentenceImportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeletePracticeSentence, usePracticeSentences } from "@/hooks/usePracticeSentences";
import { useSources } from "@/hooks/useSources";
import { useUiStore } from "@/stores/uiStore";

export const Route = createFileRoute("/practice/")({
  component: PracticePage,
});

function matchesSearch(query: string, ...fields: (string | null)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some(f => (f ?? "").toLowerCase().includes(q));
}

function PracticePage() {
  const {
    data: practiceSentences, isLoading, error,
  } = usePracticeSentences();
  const deletePracticeSentence = useDeletePracticeSentence();
  const {
    data: sources,
  } = useSources();
  const sourceName = (id: string | null) =>
    (id ? sources?.find(s => s.id === id)?.name ?? null : null);
  const showTranslations = useUiStore(s => s.showTranslations);
  const toggleShowTranslations = useUiStore(s => s.toggleShowTranslations);

  const [search, setSearch] = useState("");

  const shown = useMemo(
    () =>
      (practiceSentences ?? []).filter(ps =>
        matchesSearch(search, ps.text, ps.translation, ps.target, ps.reading)),
    [practiceSentences, search],
  );

  const nothing = !isLoading && shown.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Practice Sentences</h1>
          <p className="text-sm text-muted-foreground">
            Richly break a sentence down, keep one target, then throw most of it away. A study aid —
            these aren&apos;t professionally written, so they may need corrections.
          </p>
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
          <PracticeSentenceImportDialog />
          <Button asChild>
            <Link to="/practice/new">
              <Plus className="size-4" />
              New practice sentence
            </Link>
          </Button>
        </div>
      </div>

      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search practice sentences…"
        aria-label="Search practice sentences"
      />

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {nothing
        ? (
          <p className="text-muted-foreground">
            No practice sentences yet. Add one, or import from a capture or your bank sentences.
          </p>
        )
        : null}

      <div className="space-y-4">
        {shown.map(ps => (
          <PracticeSentenceCard
            key={ps.id}
            practiceSentence={ps}
            showTranslation={showTranslations}
            sourceName={sourceName(ps.sourceId)}
            onDelete={id => deletePracticeSentence.mutate(id)}
          />
        ))}
      </div>
    </section>
  );
}

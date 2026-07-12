import { useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { MySentenceBulkDialog } from "@/components/MySentenceBulkDialog";
import { MySentenceCard } from "@/components/MySentenceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeleteMySentence, useMySentences } from "@/hooks/useMySentences";

export const Route = createFileRoute("/my-sentences/")({
  component: MySentencesPage,
});

function MySentencesPage() {
  const {
    data: mySentences, isLoading, error,
  } = useMySentences();
  const deleteMySentence = useDeleteMySentence();
  const [search, setSearch] = useState("");
  const [onlyNeedsCorrection, setOnlyNeedsCorrection] = useState(false);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (mySentences ?? []).filter((ms) => {
      if (onlyNeedsCorrection && !ms.needsCorrection) return false;
      if (!q) return true;
      return ms.text.toLowerCase().includes(q)
        || (ms.translation ?? "").toLowerCase().includes(q)
        || (ms.correction ?? "").toLowerCase().includes(q);
    });
  }, [mySentences, search, onlyNeedsCorrection]);

  const nothing = !isLoading && shown.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Sentences</h1>
          <p className="text-sm text-muted-foreground">
            Sentences you produced yourself — from the practice worksheet or logged here (e.g. ones you
            got wrong in a lesson). Diff them against a correction and attach an explanation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link to="/my-sentences/new">
              <Plus className="size-4" />
              New sentence
            </Link>
          </Button>
          <MySentenceBulkDialog />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search your sentences…"
          aria-label="Search my sentences"
          className="max-w-sm"
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={onlyNeedsCorrection}
            onChange={e => setOnlyNeedsCorrection(e.target.checked)}
          />
          Needs correction only
        </label>
      </div>

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {nothing
        ? (
          <p className="text-muted-foreground">
            No sentences yet. Add one with “New sentence”, paste several with “Bulk add”, or write your
            own on the Output tab of a practice sentence.
          </p>
        )
        : null}

      <div className="space-y-4">
        {shown.map(ms => (
          <MySentenceCard
            key={ms.id}
            mySentence={ms}
            onDelete={id => deleteMySentence.mutate(id)}
          />
        ))}
      </div>
    </section>
  );
}

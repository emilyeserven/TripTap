import { useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { GrammarNoteCard } from "@/components/GrammarNoteCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGrammarNotes } from "@/hooks/useGrammarNotes";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usageLabel } from "@/lib/grammar-notes";

export const Route = createFileRoute("/grammar-notes/")({
  component: GrammarNotesPage,
});

function GrammarNotesPage() {
  usePageTitle("Grammar");
  const {
    data: notes, isLoading, error,
  } = useGrammarNotes();
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (notes ?? []).filter((n) => {
      if (!q) return true;
      return usageLabel(n).toLowerCase().includes(q) || (n.summary ?? "").toLowerCase().includes(q);
    });
  }, [notes, search]);

  const nothing = !isLoading && shown.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Rich notes on grammar points from your Grammar source — constructions, related grammar,
            resources, and every sentence that uses them.
          </p>
        </div>
        <Button asChild>
          <Link to="/grammar-notes/new">
            <Plus className="size-4" />
            New note
          </Link>
        </Button>
      </div>

      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search grammar notes…"
        aria-label="Search grammar notes"
        className="max-w-sm"
      />

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {nothing
        ? (
          <p className="text-muted-foreground">
            No grammar notes yet. Create one with “New note”.
          </p>
        )
        : null}

      <div className="space-y-4">
        {shown.map(note => (
          <GrammarNoteCard
            key={note.id}
            note={note}
          />
        ))}
      </div>
    </section>
  );
}

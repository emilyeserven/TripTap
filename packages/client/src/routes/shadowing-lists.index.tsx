import { useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { ShadowingListCard } from "@/components/ShadowingListCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useShadowingLists } from "@/hooks/useShadowingLists";

export const Route = createFileRoute("/shadowing-lists/")({
  component: ShadowingListsPage,
});

function ShadowingListsPage() {
  usePageTitle("Shadowing lists");
  const {
    data: lists, isLoading, error,
  } = useShadowingLists();
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (lists ?? []).filter((l) => {
      if (!q) return true;
      return l.name.toLowerCase().includes(q) || (l.notes ?? "").toLowerCase().includes(q);
    });
  }, [lists, search]);

  const nothing = !isLoading && shown.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Named collections of sentences you have flagged for shadowing practice — pulled from both
            the sentence bank and your own sentences. Add sentences to a list from any sentence card.
          </p>
        </div>
        <Button asChild>
          <Link to="/shadowing-lists/new">
            <Plus className="size-4" />
            New list
          </Link>
        </Button>
      </div>

      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search shadowing lists…"
        aria-label="Search shadowing lists"
        className="max-w-sm"
      />

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {nothing
        ? (
          <p className="text-muted-foreground">
            No shadowing lists yet. Create one with “New list”.
          </p>
        )
        : null}

      <div className="space-y-4">
        {shown.map(list => (
          <ShadowingListCard
            key={list.id}
            list={list}
          />
        ))}
      </div>
    </section>
  );
}

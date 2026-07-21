import { useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { TheorySessionCard } from "@/components/TheorySessionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useTheorySessions } from "@/hooks/useTheorySessions";

export const Route = createFileRoute("/theory-sessions/")({
  component: TheorySessionsPage,
});

function TheorySessionsPage() {
  usePageTitle("Theory Study");
  const {
    data: sessions, isLoading, error,
  } = useTheorySessions();
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (sessions ?? []).filter((s) => {
      if (!q) return true;
      return (s.title ?? "").toLowerCase().includes(q)
        || s.date.includes(q)
        || (s.notes ?? "").toLowerCase().includes(q);
    });
  }, [sessions, search]);

  const nothing = !isLoading && shown.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Log time spent learning theory — a textbook chapter, an explainer, a write-up. Counts
            toward Grammar XP by pages studied or word count, plus the notes you took.
          </p>
        </div>
        <Button asChild>
          <Link to="/theory-sessions/new">
            <Plus className="size-4" />
            New session
          </Link>
        </Button>
      </div>

      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search sessions…"
        aria-label="Search theory sessions"
        className="max-w-sm"
      />

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {nothing
        ? (
          <p className="text-muted-foreground">
            No theory sessions yet. Create one with “New session”.
          </p>
        )
        : null}

      <div className="space-y-4">
        {shown.map(session => (
          <TheorySessionCard
            key={session.id}
            session={session}
          />
        ))}
      </div>
    </section>
  );
}

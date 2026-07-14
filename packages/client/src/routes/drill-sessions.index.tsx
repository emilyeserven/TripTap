import { useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderTree, Plus, BarChart3 } from "lucide-react";

import { DrillSessionCard } from "@/components/DrillSessionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDrillSessions } from "@/hooks/useDrillSessions";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/drill-sessions/")({
  component: DrillSessionsPage,
});

function DrillSessionsPage() {
  usePageTitle("Drill Sessions");
  const {
    data: sessions, isLoading, error,
  } = useDrillSessions();
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (sessions ?? []).filter((s) => {
      if (!q) return true;
      return (s.title ?? "").toLowerCase().includes(q) || s.date.includes(q);
    });
  }, [sessions, search]);

  const nothing = !isLoading && shown.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            A journal of your drilling: log what you got wrong, tag why, and reflect. Open one to review
            it, or check your Statistics to see where mistakes cluster.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant="outline"
          >
            <Link to="/drill-sessions/reasons">
              <FolderTree className="size-4" />
              Mistake Reasons
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
          >
            <Link to="/drill-sessions/stats">
              <BarChart3 className="size-4" />
              Statistics
            </Link>
          </Button>
          <Button asChild>
            <Link to="/drill-sessions/new">
              <Plus className="size-4" />
              New session
            </Link>
          </Button>
        </div>
      </div>

      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search sessions…"
        aria-label="Search drill sessions"
        className="max-w-sm"
      />

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {nothing
        ? (
          <p className="text-muted-foreground">
            No drill sessions yet. Create one with “New session”.
          </p>
        )
        : null}

      <div className="space-y-4">
        {shown.map(session => (
          <DrillSessionCard
            key={session.id}
            session={session}
          />
        ))}
      </div>
    </section>
  );
}

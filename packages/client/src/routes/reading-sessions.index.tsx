import { useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { ReadingSessionCard } from "@/components/ReadingSessionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeleteReadingSession, useReadingSessions } from "@/hooks/useReadingSessions";

export const Route = createFileRoute("/reading-sessions/")({
  component: ReadingSessionsPage,
});

function ReadingSessionsPage() {
  const {
    data: sessions, isLoading, error,
  } = useReadingSessions();
  const deleteSession = useDeleteReadingSession();
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (sessions ?? []).filter((s) => {
      if (!q) return true;
      return s.title.toLowerCase().includes(q);
    });
  }, [sessions, search]);

  const nothing = !isLoading && shown.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reading Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Work through a passage: note where it came from, translate it freeform or line-by-line,
            record corrections, and flag the words you want to study later. Open one to review it.
          </p>
        </div>
        <Button asChild>
          <Link to="/reading-sessions/new">
            <Plus className="size-4" />
            New reading session
          </Link>
        </Button>
      </div>

      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search reading sessions…"
        aria-label="Search reading sessions"
        className="max-w-sm"
      />

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {nothing
        ? (
          <p className="text-muted-foreground">
            No reading sessions yet. Create one with “New reading session”.
          </p>
        )
        : null}

      <div className="space-y-4">
        {shown.map(session => (
          <ReadingSessionCard
            key={session.id}
            session={session}
            onDelete={id => deleteSession.mutate(id)}
          />
        ))}
      </div>
    </section>
  );
}

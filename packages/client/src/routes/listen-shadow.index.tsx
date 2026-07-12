import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { ListeningSessionCard } from "@/components/ListeningSessionCard";
import { Button } from "@/components/ui/button";
import { useListeningSessions } from "@/hooks/useListeningSessions";

export const Route = createFileRoute("/listen-shadow/")({
  component: ListenShadowIndexPage,
});

function ListenShadowIndexPage() {
  const {
    data, isLoading, error,
  } = useListeningSessions();

  return (
    <section className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Listen and Shadow</h1>
          <p className="text-sm text-muted-foreground">
            Play a video and take notes stamped with the playback time.
          </p>
        </div>
        <Button
          asChild
        >
          <Link to="/listen-shadow/new">
            <Plus className="size-4" />
            New session
          </Link>
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">{error.message}</p>}
      {data && data.length === 0 && (
        <p className="text-muted-foreground">No sessions yet. Create your first one.</p>
      )}
      {data && data.length > 0 && (
        <div
          className="
            grid gap-4
            sm:grid-cols-2
          "
        >
          {data.map(session => (
            <ListeningSessionCard
              key={session.id}
              session={session}
            />
          ))}
        </div>
      )}
    </section>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { ShadowingSessionCard } from "@/components/ShadowingSessionCard";
import { Button } from "@/components/ui/button";
import { useShadowingSessions } from "@/hooks/useShadowingSessions";

export const Route = createFileRoute("/shadowing/")({
  component: ShadowingIndexPage,
});

function ShadowingIndexPage() {
  const {
    data, isLoading, error,
  } = useShadowingSessions();

  return (
    <section className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Shadowing Practice</h1>
          <p className="text-sm text-muted-foreground">
            Loop video segments to shadow, then take notes stamped with the playback time.
          </p>
        </div>
        <Button asChild>
          <Link to="/shadowing/new">
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
            <ShadowingSessionCard
              key={session.id}
              session={session}
            />
          ))}
        </div>
      )}
    </section>
  );
}

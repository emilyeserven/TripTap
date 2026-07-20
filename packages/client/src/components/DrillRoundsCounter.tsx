import type { DrillSession } from "@sentence-bank/types";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUpdateDrillSession } from "@/hooks/useDrillSessions";

/**
 * A tally counter for rounds completed during a drill session (XP: 0.25 each). Each click PATCHes
 * immediately — the count is the whole payload, so there's nothing to batch.
 */
export function DrillRoundsCounter({
  session,
}: {
  session: DrillSession;
}) {
  const update = useUpdateDrillSession();
  const setRounds = (rounds: number) => {
    update.mutate({
      id: session.id,
      input: {
        rounds,
      },
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Rounds</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label="Remove a round"
        disabled={update.isPending || session.rounds === 0}
        onClick={() => setRounds(Math.max(0, session.rounds - 1))}
      >
        <Minus className="size-4" />
      </Button>
      <span className="min-w-6 text-center font-mono text-sm">{session.rounds}</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label="Add a round"
        disabled={update.isPending}
        onClick={() => setRounds(session.rounds + 1)}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}

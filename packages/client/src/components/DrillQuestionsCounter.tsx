import type { DrillSession } from "@sentence-bank/types";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUpdateDrillSession } from "@/hooks/useDrillSessions";

/**
 * A tally counter for questions attempted during a drill session (XP: 0.25 each). Each click PATCHes
 * immediately — the count is the whole payload, so there's nothing to batch. The Edit page also exposes
 * this value as a plain number field for entering a larger count directly.
 */
export function DrillQuestionsCounter({
  session,
}: {
  session: DrillSession;
}) {
  const update = useUpdateDrillSession();
  const setQuestions = (questions: number) => {
    update.mutate({
      id: session.id,
      input: {
        questions,
      },
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Questions</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label="Remove a question"
        disabled={update.isPending || session.questions === 0}
        onClick={() => setQuestions(Math.max(0, session.questions - 1))}
      >
        <Minus className="size-4" />
      </Button>
      <span className="min-w-6 text-center font-mono text-sm">{session.questions}</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label="Add a question"
        disabled={update.isPending}
        onClick={() => setQuestions(session.questions + 1)}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}

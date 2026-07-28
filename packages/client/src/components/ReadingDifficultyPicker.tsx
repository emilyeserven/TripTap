import type { ReadingDifficulty } from "@sentence-bank/types";

import { Button } from "@/components/ui/button";
import { READING_DIFFICULTIES } from "@/lib/reading-difficulty";
import { cn } from "@/lib/utils";

/**
 * Picks how hard the reading felt — a modifier on the session's earned XP. Clicking the active level
 * again clears it (back to unset, which scores as medium). Used on the reading-session form.
 */
export function ReadingDifficultyPicker({
  value,
  onChange,
}: {
  value: ReadingDifficulty | null;
  onChange: (value: ReadingDifficulty | null) => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-1"
      role="group"
      aria-label="Reading difficulty"
    >
      {READING_DIFFICULTIES.map((opt) => {
        const active = value === opt.value;
        return (
          <Button
            key={opt.value}
            type="button"
            size="sm"
            variant={active ? "default" : "outline"}
            aria-pressed={active}
            className={cn("gap-1.5")}
            onClick={() => onChange(active ? null : opt.value)}
          >
            {opt.label}
            <span
              className={cn(
                "text-xs tabular-nums",
                active ? "opacity-80" : "text-muted-foreground",
              )}
            >
              {opt.multiplier}
            </span>
          </Button>
        );
      })}
    </div>
  );
}

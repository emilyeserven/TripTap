import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The ✓ / ✗ review controls for one slot. The ✗ is revealed on hover; the ✓ is revealed on hover too.
 * When `persistentCorrect` (the grid), a marked-correct ✓ stays visible as the indicator; the list passes
 * `false` because it shows a persistent ✓/✗ mark to the left of the label instead.
 */
export function AnswerHoverActions({
  slotId,
  correct,
  markCorrect,
  markWrong,
  persistentCorrect = true,
}: {
  slotId: string;
  correct: boolean | null;
  markCorrect: (slotId: string) => void;
  markWrong: (slotId: string) => void;
  persistentCorrect?: boolean;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Mark correct"
        aria-pressed={correct === true}
        className={cn(
          "size-6 text-green-600 transition-opacity",
          correct === true && persistentCorrect
            ? "opacity-100"
            : `
              opacity-0
              group-hover:opacity-100
            `,
        )}
        onClick={() => markCorrect(slotId)}
      >
        <Check className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="
          size-6 text-destructive opacity-0 transition-opacity
          group-hover:opacity-100
        "
        aria-label="Mark wrong and add a correction"
        onClick={() => markWrong(slotId)}
      >
        <X className="size-4" />
      </Button>
    </span>
  );
}

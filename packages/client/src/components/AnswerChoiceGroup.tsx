import { Button } from "@/components/ui/button";

/**
 * A single-select button group for answering a T/F or multiple-choice question. The picked option is
 * stored verbatim as the answer's `value`; clicking the selected option again clears it. Used by the
 * answer-sheet editor in place of the free-text box when the slot's question declares an answer type.
 */
export function AnswerChoiceGroup({
  value,
  choices,
  onSelect,
  ariaLabel,
}: {
  value: string;
  choices: string[];
  onSelect: (value: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2"
    >
      {choices.map((choice) => {
        const selected = value === choice;
        return (
          <Button
            key={choice}
            type="button"
            variant={selected ? "default" : "outline"}
            aria-pressed={selected}
            // Re-clicking the current pick clears it, so a mis-tap is easy to undo.
            onClick={() => onSelect(selected ? "" : choice)}
          >
            {choice}
          </Button>
        );
      })}
    </div>
  );
}

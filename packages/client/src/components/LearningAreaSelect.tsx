import type { LearningArea } from "@sentence-bank/types";

import { LEARNING_AREAS } from "@sentence-bank/types";

import { Button } from "@/components/ui/button";

/**
 * The single-select sibling of {@link LearningAreaMultiSelect}: a row of toggle buttons where at most
 * one area is active. Clicking the active area clears the selection (back to null).
 */
export function LearningAreaSelect({
  value,
  onChange,
}: {
  value: LearningArea | null;
  onChange: (next: LearningArea | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {LEARNING_AREAS.map((area) => {
        const selected = value === area;
        return (
          <Button
            key={area}
            type="button"
            variant={selected ? "default" : "outline"}
            size="sm"
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : area)}
          >
            {area}
          </Button>
        );
      })}
    </div>
  );
}

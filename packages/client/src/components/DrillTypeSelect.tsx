import type { DrillType } from "@sentence-bank/types";

import { DRILL_TYPES } from "@sentence-bank/types";

import { Button } from "@/components/ui/button";

/** Human labels for each drill type. */
const DRILL_TYPE_LABELS: Record<DrillType, string> = {
  "multiple-choice": "Multiple choice",
  "fill-in-the-blank": "Fill in the blank",
};

/**
 * Single-select toggle for a drill session's {@link DrillType}, mirroring {@link LearningAreaSelect}.
 * A session is always one type; there is no clear-to-null (legacy sessions may still carry `null`,
 * shown as no selection, until the learner picks one).
 */
export function DrillTypeSelect({
  value,
  onChange,
}: {
  value: DrillType | null;
  onChange: (next: DrillType) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {DRILL_TYPES.map((type) => {
        const selected = value === type;
        return (
          <Button
            key={type}
            type="button"
            variant={selected ? "default" : "outline"}
            size="sm"
            aria-pressed={selected}
            onClick={() => onChange(type)}
          >
            {DRILL_TYPE_LABELS[type]}
          </Button>
        );
      })}
    </div>
  );
}

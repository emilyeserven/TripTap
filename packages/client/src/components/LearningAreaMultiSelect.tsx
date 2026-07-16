import type { LearningArea } from "@sentence-bank/types";

import { LEARNING_AREAS } from "@sentence-bank/types";

import { Button } from "@/components/ui/button";

/**
 * A row of toggle buttons for tagging a question sheet with any number of Learning Areas. A selected
 * area shows the solid button; unselected areas are outlined. Clicking toggles the area in/out of the
 * array.
 */
export function LearningAreaMultiSelect({
  value,
  onChange,
}: {
  value: LearningArea[];
  onChange: (next: LearningArea[]) => void;
}) {
  function toggle(area: LearningArea) {
    onChange(value.includes(area) ? value.filter(a => a !== area) : [...value, area]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {LEARNING_AREAS.map((area) => {
        const selected = value.includes(area);
        return (
          <Button
            key={area}
            type="button"
            variant={selected ? "default" : "outline"}
            size="sm"
            aria-pressed={selected}
            onClick={() => toggle(area)}
          >
            {area}
          </Button>
        );
      })}
    </div>
  );
}

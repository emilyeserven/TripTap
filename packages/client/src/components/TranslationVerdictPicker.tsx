import type { TranslationVerdict } from "@sentence-bank/types";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OPTIONS: { value: TranslationVerdict;
  label: string;
  activeClass: string; }[] = [
  {
    value: "correct",
    label: "Correct",
    activeClass: "bg-green-600 text-white hover:bg-green-600/90",
  },
  {
    value: "partial",
    label: "Partial",
    activeClass: "bg-amber-500 text-white hover:bg-amber-500/90",
  },
  {
    value: "incorrect",
    label: "Incorrect",
    activeClass: "bg-red-600 text-white hover:bg-red-600/90",
  },
];

/**
 * A three-way self-assessment of a translation: correct / partial / incorrect. Clicking the active
 * value again clears it (back to unassessed). Used inline on the reading-session view and in the edit
 * form's line/freeform blocks.
 */
export function TranslationVerdictPicker({
  value,
  onChange,
}: {
  value: TranslationVerdict | null;
  onChange: (value: TranslationVerdict | null) => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-1"
      role="group"
      aria-label="Translation verdict"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <Button
            key={opt.value}
            type="button"
            size="sm"
            variant="outline"
            aria-pressed={active}
            className={cn(active && opt.activeClass)}
            onClick={() => onChange(active ? null : opt.value)}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}

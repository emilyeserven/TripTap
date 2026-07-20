import type { LearningArea, LineupExclusions, LineupSessionType } from "@sentence-bank/types";

import { LEARNING_AREAS, LINEUP_SESSION_TYPES } from "@sentence-bank/types";

import { Button } from "@/components/ui/button";

/** Reader-facing labels for the excludable session types. */
const SESSION_TYPE_LABELS: Record<LineupSessionType, string> = {
  reading: "Reading",
  listening: "Listening",
  shadowing: "Shadowing",
  writing: "Writing",
  drills: "Drills",
  practice: "Practice",
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value];
}

function ChipRow<T extends string>({
  label,
  options,
  selected,
  display,
  onToggle,
}: {
  label: string;
  options: readonly T[];
  selected: T[];
  display?: (option: T) => string;
  onToggle: (option: T) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={active ? "destructive" : "outline"}
              aria-pressed={active}
              onClick={() => onToggle(option)}
            >
              {display?.(option) ?? option}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * "Build for today": excluded chips (destructive-styled when active) for the three property axes a
 * day can rule out — session types, learning areas, and resource media types. Media-type options are
 * whatever the loaded pools contain, unioned with active exclusions so a chip never vanishes while on.
 */
export function LineupExclusionsEditor({
  exclusions,
  mediaTypeOptions,
  onChange,
}: {
  exclusions: LineupExclusions;
  /** Media types present in the currently-loaded resource pools. */
  mediaTypeOptions: string[];
  onChange: (next: LineupExclusions) => void;
}) {
  const mediaTypes = [...new Set([...mediaTypeOptions, ...exclusions.mediaTypes])].sort();
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Rule things out for today — excluded properties won&apos;t be suggested (e.g. exclude Book
        when you won&apos;t be home).
      </p>
      <ChipRow
        label="Activities"
        options={LINEUP_SESSION_TYPES}
        selected={exclusions.sessionTypes}
        display={type => SESSION_TYPE_LABELS[type]}
        onToggle={type => onChange({
          ...exclusions,
          sessionTypes: toggle(exclusions.sessionTypes, type),
        })}
      />
      <ChipRow
        label="Learning areas"
        options={LEARNING_AREAS}
        selected={exclusions.learningAreas}
        onToggle={(area: LearningArea) => onChange({
          ...exclusions,
          learningAreas: toggle(exclusions.learningAreas, area),
        })}
      />
      <ChipRow
        label="Resource media types"
        options={mediaTypes}
        selected={exclusions.mediaTypes}
        onToggle={type => onChange({
          ...exclusions,
          mediaTypes: toggle(exclusions.mediaTypes, type),
        })}
      />
    </div>
  );
}

import type { LearningArea } from "@sentence-bank/types";

import { LearningAreaSelect } from "@/components/LearningAreaSelect";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/**
 * The two fields that decide how a study session counts: which learning area its XP feeds, and
 * whether it counts at all.
 *
 * Both existed on only a couple of session types before — a learner could retarget a drill but not
 * a reading session, and only a dialogue could be marked as sourced-not-produced. Rendering them
 * from one component is what makes the capability uniform: a session type opts in by passing its
 * default area, and gets the same control and the same wording as every other.
 */
export function SessionXpFields({
  learningArea,
  onLearningAreaChange,
  countsTowardXp,
  onCountsTowardXpChange,
  defaultArea,
  noun,
  idPrefix,
}: {
  learningArea: LearningArea | null;
  onLearningAreaChange: (next: LearningArea | null) => void;
  countsTowardXp: boolean;
  onCountsTowardXpChange: (next: boolean) => void;
  /** The area this session type credits when the learner picks none. */
  defaultArea: LearningArea;
  /** How to name this session type in the copy, e.g. "reading session". */
  noun: string;
  /** Prefix for the field ids, so several of these can coexist on one page. */
  idPrefix: string;
}) {
  return (
    <div className="space-y-3 rounded-md border p-3">
      <label className="flex items-start gap-2">
        <Checkbox
          checked={countsTowardXp}
          onCheckedChange={next => onCountsTowardXpChange(next === true)}
          aria-label={`This ${noun} counts toward XP`}
        />
        <span className="space-y-0.5">
          <span className="block text-sm font-medium">Counts toward XP</span>
          <span className="block text-xs text-muted-foreground">
            Leave off for work you sourced rather than produced — it&rsquo;s worth doing, but it
            shouldn&rsquo;t earn anything.
          </span>
        </span>
      </label>
      {countsTowardXp && (
        <div className="space-y-1.5 pl-6">
          <Label htmlFor={`${idPrefix}-area`}>Learning area</Label>
          <div id={`${idPrefix}-area`}>
            <LearningAreaSelect
              value={learningArea}
              onChange={onLearningAreaChange}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {learningArea
              ? `This ${noun}'s XP credits ${learningArea}.`
              : `Defaults to ${defaultArea}. Pick an area if this ${noun} was really about something else.`}
          </p>
        </div>
      )}
    </div>
  );
}

import type { LearnerGoal } from "@sentence-bank/types";

import { useEffect, useState } from "react";

import { MAX_LEARNER_GOALS } from "@sentence-bank/types";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { LearningAreaMultiSelect } from "@/components/LearningAreaMultiSelect";
import { TermPicker } from "@/components/TermPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLearnerProfile, useUpdateLearnerProfile } from "@/hooks/useSettings";
import { newId } from "@/lib/id";

/** An unsaved blank goal. */
function emptyGoal(): LearnerGoal {
  return {
    id: newId(),
    title: "",
    notes: null,
    learningAreas: [],
    grammarTerms: [],
    resourceTerms: [],
  };
}

/**
 * Edits the whole learner profile in place: up to {@link MAX_LEARNER_GOALS} goal cards, each targeting
 * any mix of learning areas, grammar terms, and resources. Saving PATCHes the full goal list (goals
 * without a title are dropped), matching the tri-state settings contract.
 */
export function LearnerGoalsEditor() {
  const profile = useLearnerProfile();
  const update = useUpdateLearnerProfile();
  const [goals, setGoals] = useState<LearnerGoal[]>([]);
  const [loadedFor, setLoadedFor] = useState<LearnerGoal[] | null>(null);

  // Seed local state once the profile arrives (and re-seed if a save round-trips new data).
  useEffect(() => {
    if (profile.data && profile.data.goals !== loadedFor) {
      setGoals(profile.data.goals);
      setLoadedFor(profile.data.goals);
    }
  }, [profile.data, loadedFor]);

  const patchGoal = (id: string, patch: Partial<LearnerGoal>) => {
    setGoals(prev => prev.map(goal => (goal.id === id
      ? {
        ...goal,
        ...patch,
      }
      : goal)));
  };

  const save = () => {
    const cleaned = goals
      .map(goal => ({
        ...goal,
        title: goal.title.trim(),
        notes: goal.notes?.trim() || null,
      }))
      .filter(goal => goal.title.length > 0);
    update.mutate({
      goals: cleaned.length > 0 ? cleaned : null,
    }, {
      onSuccess: () => toast.success("Goals saved"),
      onError: err => toast.error("Couldn't save the goals", {
        description: err instanceof Error ? err.message : undefined,
      }),
    });
  };

  if (profile.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading profile…</p>;
  }

  return (
    <div className="space-y-4">
      {goals.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No goals yet. Set up to {MAX_LEARNER_GOALS} — each can target learning areas, grammar
          points, or resources, and Start Something will steer suggestions toward them.
        </p>
      )}

      {goals.map((goal, index) => (
        <Card key={goal.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Goal {index + 1}</CardTitle>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={`Remove goal ${index + 1}`}
              onClick={() => setGoals(prev => prev.filter(g => g.id !== goal.id))}
            >
              <Trash2 className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`goal-title-${goal.id}`}>Title</Label>
              <Input
                id={`goal-title-${goal.id}`}
                value={goal.title}
                onChange={e => patchGoal(goal.id, {
                  title: e.target.value,
                })}
                placeholder="e.g. Hold a 10-minute conversation"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`goal-notes-${goal.id}`}>Notes (optional)</Label>
              <Textarea
                id={`goal-notes-${goal.id}`}
                value={goal.notes ?? ""}
                onChange={e => patchGoal(goal.id, {
                  notes: e.target.value || null,
                })}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Learning areas</Label>
              <LearningAreaMultiSelect
                value={goal.learningAreas}
                onChange={learningAreas => patchGoal(goal.id, {
                  learningAreas,
                })}
              />
            </div>
            <TermPicker
              label="Grammar points"
              category="grammar"
              value={goal.grammarTerms}
              onChange={grammarTerms => patchGoal(goal.id, {
                grammarTerms,
              })}
            />
            <TermPicker
              label="Resources"
              category="resource"
              value={goal.resourceTerms}
              onChange={resourceTerms => patchGoal(goal.id, {
                resourceTerms,
              })}
            />
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center gap-2">
        {goals.length < MAX_LEARNER_GOALS && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setGoals(prev => [...prev, emptyGoal()])}
          >
            <Plus className="size-4" />
            Add goal
          </Button>
        )}
        <Button
          type="button"
          onClick={save}
          disabled={update.isPending}
        >
          {update.isPending ? "Saving…" : "Save goals"}
        </Button>
      </div>
    </div>
  );
}

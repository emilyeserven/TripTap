import { useEffect, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLearnerProfile, useUpdateLearnerProfile } from "@/hooks/useSettings";

/**
 * Sets the minimum XP the learner wants to earn each day. Lives on the Profile page with the goals;
 * the Start Something page shows today's progress against it.
 */
export function DailyXpGoalCard() {
  const profile = useLearnerProfile();
  const update = useUpdateLearnerProfile();
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    if (profile.data && draft === null) {
      setDraft(profile.data.dailyXpGoal != null ? String(profile.data.dailyXpGoal) : "");
    }
  }, [profile.data, draft]);

  const save = () => {
    if (draft === null) return;
    const value = draft.trim() === "" ? null : Number(draft);
    if (value !== null && (!Number.isFinite(value) || value <= 0)) {
      toast.error("The daily goal needs a positive number (or empty to clear)");
      return;
    }
    update.mutate({
      dailyXpGoal: value,
    }, {
      onSuccess: () => toast.success(value === null ? "Daily goal cleared" : "Daily goal saved"),
      onError: err => toast.error("Couldn't save the daily goal", {
        description: err instanceof Error ? err.message : undefined,
      }),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Daily activity goal</CardTitle>
        <CardDescription>
          The minimum XP you want to earn each day. The Start page tracks today&apos;s progress.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="daily-xp-goal">XP per day</Label>
          <Input
            id="daily-xp-goal"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            className="w-32"
            placeholder="e.g. 20"
            value={draft ?? ""}
            onChange={e => setDraft(e.target.value)}
          />
        </div>
        <Button
          type="button"
          onClick={save}
          disabled={draft === null || update.isPending}
        >
          {update.isPending ? "Saving…" : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

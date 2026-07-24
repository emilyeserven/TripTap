import { useEffect, useState } from "react";

import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLearnerProfile, useUpdateLearnerProfile } from "@/hooks/useSettings";

/** A 12-hour clock label for an hour 0–23, e.g. 0 → "12:00 AM (midnight)", 15 → "3:00 PM". */
function hourLabel(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour === 0 ? " (midnight)" : hour === 12 ? " (noon)" : "";
  return `${h12}:00 ${period}${suffix}`;
}

const HOURS = Array.from({
  length: 24,
}, (_, hour) => hour);

/**
 * Sets the hour a new day starts for XP/activity counting. Lives on the Profile page with the daily
 * goal. Work before this hour counts toward the previous day — so late-night sessions don't roll into
 * tomorrow. Saves immediately on change (the profile mutation is cheap).
 */
export function DayStartHourCard() {
  const profile = useLearnerProfile();
  const update = useUpdateLearnerProfile();
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    if (profile.data && value === null) {
      setValue(String(profile.data.dayStartHour));
    }
  }, [profile.data, value]);

  const save = (next: string) => {
    setValue(next);
    update.mutate({
      dayStartHour: Number(next),
    }, {
      onSuccess: () => toast.success(`New day starts at ${hourLabel(Number(next))}`),
      onError: err => toast.error("Couldn't save the day start time", {
        description: err instanceof Error ? err.message : undefined,
      }),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Start of day</CardTitle>
        <CardDescription>
          When a new day begins for XP and activity counting. Work before this hour counts toward the
          previous day — handy if you often study past midnight.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="day-start-hour">New day starts at</Label>
          <Select
            value={value ?? undefined}
            onValueChange={save}
            disabled={value === null || update.isPending}
          >
            <SelectTrigger
              id="day-start-hour"
              className="w-48"
            >
              <SelectValue placeholder="Midnight" />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map(hour => (
                <SelectItem
                  key={hour}
                  value={String(hour)}
                >
                  {hourLabel(hour)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

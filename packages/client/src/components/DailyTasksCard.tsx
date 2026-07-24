import type { BookmarkResource, DailyTask } from "@sentence-bank/types";

import { CalendarCheck } from "lucide-react";

import { DailyTaskRow } from "@/components/DailyTaskRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * The recurring "Daily tasks" card, pinned above Today's lineup on the Start page: each task is a
 * resource the learner works on every day, checkable and reset overnight. The picker to add one lives
 * in a separate {@link AddDailyTaskCard}; this card owns no persistence — changes go to the parent.
 */
export function DailyTasksCard({
  tasks,
  resources,
  doneIds,
  onToggle,
  onRemove,
}: {
  tasks: DailyTask[];
  resources: BookmarkResource[];
  doneIds: string[];
  onToggle: (taskId: string) => void;
  onRemove: (taskId: string) => void;
}) {
  const doneCount = tasks.filter(t => doneIds.includes(t.id)).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <CalendarCheck className="size-4" />
            Daily tasks
          </span>
          {tasks.length > 0 && (
            <span
              className="text-sm font-normal text-muted-foreground tabular-nums"
            >
              {doneCount}/{tasks.length} done
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0
          ? (
            <p className="text-sm text-muted-foreground">
              No daily tasks yet — add a resource you want to work on every day.
            </p>
          )
          : (
            <ul className="space-y-2">
              {tasks.map(task => (
                <DailyTaskRow
                  key={task.id}
                  task={task}
                  resources={resources}
                  done={doneIds.includes(task.id)}
                  onToggle={() => onToggle(task.id)}
                  onRemove={() => onRemove(task.id)}
                />
              ))}
            </ul>
          )}
      </CardContent>
    </Card>
  );
}

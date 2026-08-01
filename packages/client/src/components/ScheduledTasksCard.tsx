import type { AnswerSheet, QuestionSheet, ScheduledTask } from "@sentence-bank/types";

import { CalendarClock } from "lucide-react";

import { ScheduledTaskRow } from "@/components/ScheduledTaskRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { questionSheetParts } from "@/lib/answer-sheets";

/** Section label (resource) or part label (answer sheet) shown under a task; null when none. */
function subtitleFor(
  task: ScheduledTask,
  answerSheets: AnswerSheet[],
  questionSheets: QuestionSheet[],
): string | null {
  const t = task.target;
  if (t.kind === "resource") return t.section?.label ?? null;
  if (!t.partId) return null;
  const sheet = answerSheets.find(a => a.id === t.answerSheetId);
  const questionSheet = sheet && questionSheets.find(q => q.id === sheet.questionSheetId);
  if (!questionSheet) return null;
  return questionSheetParts(questionSheet).find(p => p.id === t.partId)?.label ?? null;
}

/**
 * The "Scheduled" card on the Start page: one-off tasks bucketed by day (Today / Tomorrow / Later),
 * each opening a resource+section or an answer-sheet part. Owns no persistence — changes go to the
 * parent, mirroring {@link DailyTasksCard}.
 */
export function ScheduledTasksCard({
  tasks,
  answerSheets,
  questionSheets,
  endpointUrl,
  today,
  tomorrow,
  onToggle,
  onRemove,
}: {
  tasks: ScheduledTask[];
  answerSheets: AnswerSheet[];
  questionSheets: QuestionSheet[];
  endpointUrl: string | null | undefined;
  today: string;
  tomorrow: string;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (tasks.length === 0) return null;

  const groups: { key: string;
    label: string;
    tasks: ScheduledTask[]; }[] = [
    {
      key: "today",
      label: "Today",
      tasks: tasks.filter(t => t.date <= today),
    },
    {
      key: "tomorrow",
      label: "Tomorrow",
      tasks: tasks.filter(t => t.date === tomorrow),
    },
    {
      key: "later",
      label: "Later",
      tasks: tasks.filter(t => t.date > today && t.date !== tomorrow),
    },
  ].filter(g => g.tasks.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4" />
          Scheduled
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {groups.map(group => (
          <div
            key={group.key}
            className="space-y-2"
          >
            <p
              className="
                text-xs font-semibold tracking-wide text-muted-foreground
                uppercase
              "
            >
              {group.label}
            </p>
            <ul className="space-y-2">
              {[...group.tasks]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(task => (
                  <ScheduledTaskRow
                    key={task.id}
                    task={task}
                    subtitle={subtitleFor(task, answerSheets, questionSheets)}
                    endpointUrl={endpointUrl}
                    onToggle={() => onToggle(task.id)}
                    onRemove={() => onRemove(task.id)}
                  />
                ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

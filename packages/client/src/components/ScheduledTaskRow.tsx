import type { ScheduledTask } from "@sentence-bank/types";
import type * as React from "react";

import { Link } from "@tanstack/react-router";
import { BookOpen, ClipboardCheck, ExternalLink, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { scheduledTaskOpen, scheduledTaskTitle } from "@/lib/scheduled-tasks";

/** Cast a dynamic router link to the Link's prop shape (same trick the lineup uses for snapshots). */
function linkProps(open: NonNullable<ReturnType<typeof scheduledTaskOpen>["internal"]>): React.ComponentProps<typeof Link> {
  return open as unknown as React.ComponentProps<typeof Link>;
}

/** One scheduled task: a done checkbox, a link to open the target, an optional subtitle, and remove. */
export function ScheduledTaskRow({
  task,
  subtitle,
  endpointUrl,
  onToggle,
  onRemove,
}: {
  task: ScheduledTask;
  /** Section label (resource) or part label (answer sheet); null when none. */
  subtitle: string | null;
  endpointUrl: string | null | undefined;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const open = scheduledTaskOpen(task.target, endpointUrl);
  const title = scheduledTaskTitle(task);
  const Icon = task.target.kind === "answer-sheet" ? ClipboardCheck : BookOpen;

  const linkClass = `
    flex min-w-0 flex-1 flex-col
    hover:underline
    ${task.done ? "text-muted-foreground line-through" : ""}
  `;
  const body = (
    <>
      <span className="truncate font-medium">{title}</span>
      {subtitle ? <span className="truncate text-xs text-muted-foreground">{subtitle}</span> : null}
    </>
  );

  return (
    <li className="flex items-center gap-2 rounded-md border p-2 text-sm">
      <Checkbox
        checked={task.done}
        aria-label={task.done ? `Mark "${title}" not done` : `Mark "${title}" done`}
        onCheckedChange={onToggle}
      />
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      {open.internal
        ? (
          <Link
            {...linkProps(open.internal)}
            className={linkClass}
          >
            {body}
          </Link>
        )
        : (
          <a
            href={open.external}
            target="_blank"
            rel="noreferrer"
            className={linkClass}
          >
            <span className="flex items-center gap-1">
              {body}
              <ExternalLink className="size-3 shrink-0" />
            </span>
          </a>
        )}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-7 shrink-0"
        aria-label={`Remove "${title}"`}
        onClick={onRemove}
      >
        <X className="size-4" />
      </Button>
    </li>
  );
}

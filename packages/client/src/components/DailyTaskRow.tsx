import type { BookmarkResource, DailyTask } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { BookOpen, Dumbbell, X } from "lucide-react";

import { LearningAreaBadges } from "@/components/LearningAreaBadges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useBookmarkRecord } from "@/hooks/useBookmarks";
import { useBookmarksSettings } from "@/hooks/useSettings";
import { resourceMaterialTypes } from "@/lib/collections";
import { resolveDailyTaskAction } from "@/lib/daily-tasks";

/** Cast dynamic `to`/`search` to the Link's prop shape (same trick the lineup uses for snapshotted links). */
function linkProps(to: string, search: Record<string, string>): React.ComponentProps<typeof Link> {
  return {
    to,
    search,
  } as unknown as React.ComponentProps<typeof Link>;
}

/**
 * One recurring daily task: a checkbox (done-today), a link derived live from the resource (next
 * uncompleted section → reading, else drill-tag → drill, else whole-resource reading), and a remove
 * control. Fetches the resource's section tree itself so the link always reflects current progress.
 */
export function DailyTaskRow({
  task,
  resources,
  done,
  onToggle,
  onRemove,
}: {
  task: DailyTask;
  /** The live resource list, to resolve tags/title by id; falls back to the task's snapshot. */
  resources: BookmarkResource[];
  done: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const record = useBookmarkRecord(task.resourceId);
  const {
    data: bookmarksSettings,
  } = useBookmarksSettings();
  const drillTags = bookmarksSettings?.drillTags ?? {};
  const materialTags = bookmarksSettings?.materialTypeTags ?? {};

  const live = resources.find(r => r.id === task.resourceId);
  const resource = {
    id: task.resourceId,
    title: live?.title ?? task.resourceTitle,
    url: live?.url ?? null,
    tagIds: live?.tagIds ?? [],
  };
  const sectionTree = record.data?.sectionTree ?? [];
  const sequential = resourceMaterialTypes(resource.tagIds, materialTags).includes("Sequential Material");
  const action = resolveDailyTaskAction({
    resource,
    sectionTree,
    drillTags,
    sequential,
  });

  return (
    <li className="flex items-center gap-2 rounded-md border p-2 text-sm">
      <Checkbox
        checked={done}
        aria-label={done ? `Mark "${resource.title}" not done` : `Mark "${resource.title}" done`}
        onCheckedChange={onToggle}
      />
      {action.kind === "drill"
        ? <Dumbbell className="size-4 shrink-0 text-muted-foreground" />
        : <BookOpen className="size-4 shrink-0 text-muted-foreground" />}
      <Link
        {...linkProps(action.to, action.search)}
        className={`
          flex min-w-0 flex-1 flex-col
          hover:underline
          ${done ? "text-muted-foreground line-through" : ""}
        `}
      >
        <span className="truncate font-medium">{task.label ?? resource.title}</span>
        {!task.label && action.kind === "reading-section"
          ? <span className="truncate text-xs text-muted-foreground">{action.label}</span>
          : null}
      </Link>
      {task.area && <LearningAreaBadges areas={[task.area]} />}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label={`Remove "${resource.title}" from daily tasks`}
        onClick={onRemove}
      >
        <X className="size-4" />
      </Button>
    </li>
  );
}

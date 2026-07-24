import type { DailyTask } from "@sentence-bank/types";

import { useState } from "react";

import { ChevronDown, Plus } from "lucide-react";

import { BookmarkPicker } from "@/components/BookmarkPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { newId } from "@/lib/id";

/**
 * A collapsible card (collapsed by default) for adding a recurring daily task: pick a Resources
 * bookmark and it's appended to the learner's daily tasks. Kept separate from the tasks list so the
 * picker stays out of the way until wanted. Owns no persistence — new tasks are handed to the parent.
 */
export function AddDailyTaskCard({
  tasks,
  onAdd,
}: {
  tasks: DailyTask[];
  onAdd: (task: DailyTask) => void;
}) {
  const [open, setOpen] = useState(false);

  const addResource = (record: { id: string;
    title: string; } | null) => {
    if (!record) return;
    // One task per resource — re-picking an existing one is a no-op.
    if (tasks.some(t => t.resourceId === record.id)) return;
    onAdd({
      id: `task-${newId()}`,
      resourceId: record.id,
      resourceTitle: record.title,
      label: null,
      area: null,
    });
    setOpen(false);
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      asChild
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="size-4" />
            Add a daily task
          </CardTitle>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={open ? "Hide the resource picker" : "Add a daily task"}
            >
              <ChevronDown
                className={`
                  size-4 transition-transform
                  ${open ? "rotate-180" : ""}
                `}
              />
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <BookmarkPicker
              category="resource"
              label="Resource"
              selectedBookmarkId={null}
              selectedBookmarkTitle={null}
              onPick={addResource}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

import type { ShadowingList } from "@sentence-bank/types";

import { useState } from "react";

import { ListPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useCreateShadowingList,
  useShadowingLists,
  useUpdateShadowingList,
} from "@/hooks/useShadowingLists";

/**
 * A drop-in control for adding one sentence (any kind) to any number of named shadowing lists.
 * Shows a checkbox per existing list plus an inline "create a list with this sentence in it" field.
 */
export function AddToShadowingListButton({
  id,
}: {
  id: string;
}) {
  const {
    data: lists,
  } = useShadowingLists();
  const update = useUpdateShadowingList();
  const create = useCreateShadowingList();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const isIn = (l: ShadowingList) => l.sentenceIds.includes(id);
  const memberOfCount = (lists ?? []).filter(isIn).length;

  const toggle = (l: ShadowingList) => {
    const next = isIn(l) ? l.sentenceIds.filter(x => x !== id) : [...l.sentenceIds, id];
    update.mutate({
      id: l.id,
      input: {
        sentenceIds: next,
      },
    });
  };

  const createAndAdd = () => {
    const name = newName.trim();
    if (!name || create.isPending) return;
    create.mutate(
      {
        name,
        sentenceIds: [id],
      },
      {
        onSuccess: () => setNewName(""),
      },
    );
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={`
            size-7
            ${memberOfCount > 0
      ? "text-primary"
      : "text-muted-foreground"}
          `}
          aria-label="Add to a shadowing list"
          title={memberOfCount > 0 ? `In ${memberOfCount} shadowing list(s)` : "Add to a shadowing list"}
        >
          <ListPlus className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 space-y-2"
        align="end"
      >
        <p className="text-xs font-medium text-muted-foreground">Shadowing lists</p>
        {(lists ?? []).length === 0
          ? <p className="text-xs text-muted-foreground">No lists yet — create one below.</p>
          : (lists ?? []).map(l => (
            <label
              key={l.id}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={isIn(l)}
                onCheckedChange={() => toggle(l)}
              />
              <span className="truncate">{l.name}</span>
            </label>
          ))}
        <div className="flex items-center gap-2 border-t pt-2">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createAndAdd();
              }
            }}
            placeholder="New list…"
            className="h-8"
          />
          <Button
            size="sm"
            className="h-8"
            onClick={createAndAdd}
            disabled={!newName.trim() || create.isPending}
          >
            Add
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

import type { ShadowingList } from "@sentence-bank/types";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateShadowingList, useUpdateShadowingList } from "@/hooks/useShadowingLists";

/**
 * Create/edit form for a shadowing list (name + notes). Membership is managed from sentence cards, not
 * here — editing only renames/re-notes, leaving the list's sentences untouched.
 */
export function ShadowingListForm({
  list,
  onSuccess,
}: {
  list?: ShadowingList;
  onSuccess?: (id: string) => void;
}) {
  const create = useCreateShadowingList();
  const update = useUpdateShadowingList();
  const editing = list !== undefined;

  const [name, setName] = useState(list?.name ?? "");
  const [notes, setNotes] = useState(list?.notes ?? "");

  const pending = create.isPending || update.isPending;
  const canSubmit = name.trim().length > 0 && !pending;

  const submit = async () => {
    if (!canSubmit) return;
    const input = {
      name: name.trim(),
      notes: notes.trim() || null,
    };
    const saved = editing
      ? await update.mutateAsync({
        id: list.id,
        input,
      })
      : await create.mutateAsync(input);
    onSuccess?.(saved.id);
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="shadowing-list-name">Name</Label>
        <Input
          id="shadowing-list-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Morning drill"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="shadowing-list-notes">Notes (optional)</Label>
        <Textarea
          id="shadowing-list-notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="What this list is for, or how you practice it."
          rows={4}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={!canSubmit}
        >
          {pending
            ? "Saving…"
            : editing
              ? "Save changes"
              : "Create list"}
        </Button>
      </div>
    </form>
  );
}

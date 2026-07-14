import type { Tutor } from "@sentence-bank/types";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTutor, useUpdateTutor } from "@/hooks/useTutors";

/**
 * Create/edit form for a tutor. One component powers both the new and edit pages — pass a `tutor` to
 * edit an existing one.
 */
export function TutorForm({
  tutor,
  onSuccess,
}: {
  tutor?: Tutor;
  onSuccess?: (id: string) => void;
}) {
  const create = useCreateTutor();
  const update = useUpdateTutor();
  const editing = tutor !== undefined;

  const [name, setName] = useState(tutor?.name ?? "");
  const [notes, setNotes] = useState(tutor?.notes ?? "");

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
        id: tutor.id,
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
        <Label htmlFor="tutor-name">Name</Label>
        <Input
          id="tutor-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Tanaka-sensei"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tutor-notes">Notes (optional)</Label>
        <Textarea
          id="tutor-notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Anything worth remembering about this tutor."
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
              : "Create tutor"}
        </Button>
      </div>
    </form>
  );
}

import { useState } from "react";

import { useCreateTutor, useTutors } from "../hooks/useTutors";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Radix Select forbids empty-string item values, so map "no tutor" to a sentinel.
const NONE = "__none";
const NEW = "__new";

/**
 * Chooses the tutor a lesson is associated with. Users either pick an existing tutor or switch to a
 * small inline form to create one; on create it is selected immediately. `value` is the selected
 * `tutor_id` (or null for "no tutor"). Mirrors {@link SourcePicker}.
 */
export function TutorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (tutorId: string | null) => void;
}) {
  const {
    data: tutors,
  } = useTutors();
  const createTutor = useCreateTutor();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  async function saveNew() {
    if (!name.trim()) return;
    const created = await createTutor.mutateAsync({
      name: name.trim(),
      notes: notes.trim() || null,
    });
    onChange(created.id);
    setName("");
    setNotes("");
    setCreating(false);
  }

  if (creating) {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">New tutor</p>
        <Input
          placeholder="Name (e.g. Tanaka-sensei)"
          aria-label="Tutor name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <Textarea
          placeholder="Notes (optional)"
          aria-label="Tutor notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!name.trim() || createTutor.isPending}
            onClick={() => void saveNew()}
          >
            {createTutor.isPending ? "Saving…" : "Save tutor"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCreating(false)}
          >
            Cancel
          </Button>
        </div>
        {createTutor.isError
          ? <p className="text-xs text-destructive">{createTutor.error?.message}</p>
          : null}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="tutor-picker">Tutor</Label>
      <Select
        value={value ?? NONE}
        onValueChange={(next) => {
          if (next === NEW) {
            setCreating(true);
            return;
          }
          onChange(next === NONE ? null : next);
        }}
      >
        <SelectTrigger
          id="tutor-picker"
          className="w-full"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No tutor</SelectItem>
          {(tutors ?? []).map(t => (
            <SelectItem
              key={t.id}
              value={t.id}
            >
              {t.name}
            </SelectItem>
          ))}
          <SelectItem value={NEW}>+ New tutor…</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

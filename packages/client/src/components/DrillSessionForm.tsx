import type { DrillMistake, DrillSession, LearningArea } from "@sentence-bank/types";

import { useState } from "react";

import { DrillMistakes } from "@/components/DrillMistakes";
import { LearningAreaSelect } from "@/components/LearningAreaSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateDrillSession, useUpdateDrillSession } from "@/hooks/useDrillSessions";

/** Today's date as `YYYY-MM-DD`, for the default session date. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Create/edit form for a drill session. One component powers both the new and edit pages — pass a
 * `session` to edit an existing one. Mistake rows without a filled `prompt` are dropped on save.
 */
export function DrillSessionForm({
  session,
  onSuccess,
}: {
  session?: DrillSession;
  onSuccess?: (id: string) => void;
}) {
  const create = useCreateDrillSession();
  const update = useUpdateDrillSession();
  const editing = session !== undefined;

  const [date, setDate] = useState(session?.date ?? todayIso());
  const [title, setTitle] = useState(session?.title ?? "");
  const [notes, setNotes] = useState(session?.notes ?? "");
  const [mistakes, setMistakes] = useState<DrillMistake[]>(session?.mistakes ?? []);
  const [learningArea, setLearningArea] = useState<LearningArea | null>(
    session?.learningArea ?? null,
  );

  const pending = create.isPending || update.isPending;
  const canSubmit = date.trim().length > 0 && !pending;

  const submit = async () => {
    if (!canSubmit) return;
    const cleaned = mistakes
      .filter(m => m.prompt.trim().length > 0)
      .map(m => ({
        ...m,
        prompt: m.prompt.trim(),
        correctAnswer: m.correctAnswer?.trim() || null,
        reflection: m.reflection?.trim() || null,
      }));
    const input = {
      date,
      title: title.trim() || null,
      notes: notes.trim() || null,
      mistakes: cleaned.length > 0 ? cleaned : null,
      learningArea,
    };
    const saved = editing
      ? await update.mutateAsync({
        id: session.id,
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
      <div
        className="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <div className="space-y-1.5">
          <Label htmlFor="drill-date">Date</Label>
          <Input
            id="drill-date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="drill-title">Title (optional)</Label>
          <Input
            id="drill-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Verb conjugation review"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Learning area (optional)</Label>
        <p className="text-xs text-muted-foreground">
          Where this session&apos;s XP counts. Unset counts toward Grammar.
        </p>
        <LearningAreaSelect
          value={learningArea}
          onChange={setLearningArea}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="drill-notes">Notes (optional)</Label>
        <Textarea
          id="drill-notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Anything about this drilling session as a whole."
          rows={3}
        />
      </div>

      <DrillMistakes
        mistakes={mistakes}
        onChange={setMistakes}
      />

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={!canSubmit}
        >
          {pending
            ? "Saving…"
            : editing
              ? "Save changes"
              : "Create session"}
        </Button>
      </div>
    </form>
  );
}

import type { DrillMistake, DrillSession, DrillType, LearningArea } from "@sentence-bank/types";

import { useState } from "react";

import { DEFAULT_XP_RATES } from "@sentence-bank/types";

import { DrillMistakes } from "@/components/DrillMistakes";
import { DrillTypeSelect } from "@/components/DrillTypeSelect";
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
 * `session` to edit an existing one. A mistake row is kept on save when it has any content (question,
 * answer, correct answer, reflection, or a reason); an empty "what you got wrong" just means the
 * answer was skipped. Only fully-blank rows are dropped.
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
  const [questions, setQuestions] = useState(String(session?.questions ?? 0));
  // New sessions default to fill-in-the-blank; existing ones keep their stored type (may be null legacy).
  const [type, setType] = useState<DrillType | null>(
    session ? session.type : "fill-in-the-blank",
  );
  const [learningArea, setLearningArea] = useState<LearningArea | null>(
    session?.learningArea ?? null,
  );

  // Multiple-choice questions earn less; a null (legacy) type scores at the fill-in-the-blank rate.
  const xpPerQuestion = type === "multiple-choice"
    ? DEFAULT_XP_RATES.drillQuestionMultipleChoice
    : DEFAULT_XP_RATES.drillQuestion;

  const pending = create.isPending || update.isPending;
  const canSubmit = date.trim().length > 0 && !pending;

  const submit = async () => {
    if (!canSubmit) return;
    const cleaned = mistakes
      .map(m => ({
        ...m,
        question: m.question?.trim() || null,
        prompt: m.prompt.trim(),
        correctAnswer: m.correctAnswer?.trim() || null,
        reflection: m.reflection?.trim() || null,
      }))
      // Keep a row with any real content; an empty `prompt` just records a skipped answer.
      .filter(m => m.question || m.prompt || m.correctAnswer || m.reflection || m.reasons.length > 0);
    const input = {
      date,
      title: title.trim() || null,
      notes: notes.trim() || null,
      mistakes: cleaned.length > 0 ? cleaned : null,
      questions: Math.max(0, Math.trunc(Number(questions) || 0)),
      type,
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
        <Label>Drill type</Label>
        <p className="text-xs text-muted-foreground">
          Multiple-choice questions earn
          {" "}
          {DEFAULT_XP_RATES.drillQuestionMultipleChoice}
          {" "}
          XP each; fill-in-the-blank earn
          {" "}
          {DEFAULT_XP_RATES.drillQuestion}
          .
        </p>
        <DrillTypeSelect
          value={type}
          onChange={setType}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="drill-questions">Questions attempted</Label>
        <p className="text-xs text-muted-foreground">
          How many questions you drilled this session. Earns
          {" "}
          {xpPerQuestion}
          {" "}
          XP each.
        </p>
        <Input
          id="drill-questions"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          className="w-32"
          value={questions}
          onChange={e => setQuestions(e.target.value)}
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

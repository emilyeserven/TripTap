import type { QuestionSheetPart, QuestionSheetQuestion } from "@sentence-bank/types";

import { useState } from "react";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { PartQuickAdd } from "@/components/PartQuickAdd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { newSheetItemId } from "@/lib/question-sheet-parts";

/**
 * The "list of questions" editor of the question-sheet form: a quick-fill count box plus a dynamic
 * list of questions, each with reorder/remove controls and labelled parts. The parent owns the
 * questions array; this component owns only the quick-fill input.
 */
export function QuestionListEditor({
  questions,
  onChange,
}: {
  questions: QuestionSheetQuestion[];
  onChange: (questions: QuestionSheetQuestion[]) => void;
}) {
  const [quickCount, setQuickCount] = useState("");

  function addQuestion() {
    onChange([...questions, {
      id: newSheetItemId("q"),
      prompt: "",
    }]);
  }
  /**
   * Quick-fill: replace the questions with `n` blank slots. Lets the user say "there are 12 questions"
   * without typing each one — the answer sheet then renders the right number of inputs, each labelled
   * "Question N" via {@link questionSheetSlots}'s positional fallback. Existing questions are replaced
   * (the count is authoritative).
   */
  function quickFill() {
    const n = Math.floor(Number(quickCount));
    if (!Number.isFinite(n) || n < 1) return;
    onChange(
      Array.from({
        length: Math.min(n, 200),
      }, () => ({
        id: newSheetItemId("q"),
        prompt: "",
      })),
    );
  }
  function updateQuestion(id: string, patch: Partial<QuestionSheetQuestion>) {
    onChange(questions.map(q => (q.id === id
      ? {
        ...q,
        ...patch,
      }
      : q)));
  }
  function removeQuestion(id: string) {
    onChange(questions.filter(q => q.id !== id));
  }
  function moveQuestion(index: number, delta: number) {
    const next = [...questions];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }
  function addPart(questionId: string) {
    onChange(questions.map(q =>
      (q.id === questionId
        ? {
          ...q,
          parts: [...(q.parts ?? []), {
            id: newSheetItemId("p"),
            label: "",
          }],
        }
        : q)));
  }
  /** Append a batch of pre-labelled parts to a question (used by the quick-add controls). */
  function addParts(questionId: string, newParts: QuestionSheetPart[]) {
    if (newParts.length === 0) return;
    onChange(questions.map(q =>
      (q.id === questionId
        ? {
          ...q,
          parts: [...(q.parts ?? []), ...newParts],
        }
        : q)));
  }
  function updatePart(questionId: string, partId: string, label: string) {
    onChange(questions.map(q =>
      (q.id === questionId
        ? {
          ...q,
          parts: (q.parts ?? []).map(p => (p.id === partId
            ? {
              ...p,
              label,
            }
            : p)),
        }
        : q)));
  }
  function removePart(questionId: string, partId: string) {
    onChange(questions.map(q =>
      (q.id === questionId
        ? {
          ...q,
          parts: (q.parts ?? []).filter(p => p.id !== partId),
        }
        : q)));
  }

  return (
    <div className="space-y-4">
      <div
        className="
          flex flex-wrap items-end gap-2 rounded-md border border-dashed p-3
        "
      >
        <div className="space-y-1.5">
          <Label htmlFor="qs-quick-count">Quick fill — number of questions</Label>
          <Input
            id="qs-quick-count"
            type="number"
            min={1}
            value={quickCount}
            onChange={e => setQuickCount(e.target.value)}
            placeholder="12"
            className="w-24"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={quickFill}
        >
          Set questions
        </Button>
        <p className="w-full text-xs text-muted-foreground">
          Generates that many numbered questions so the answer sheet has the right number of
          inputs — you don’t have to type each one. Editing below still works.
        </p>
      </div>
      {questions.map((q, index) => (
        <div
          key={q.id}
          className="space-y-3 rounded-md border p-4"
        >
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`q-${q.id}`}>Question {index + 1}</Label>
              <Textarea
                id={`q-${q.id}`}
                value={q.prompt}
                onChange={e => updateQuestion(q.id, {
                  prompt: e.target.value,
                })}
                placeholder="Write the question or prompt…"
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-1 pt-6">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Move question up"
                disabled={index === 0}
                onClick={() => moveQuestion(index, -1)}
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Move question down"
                disabled={index === questions.length - 1}
                onClick={() => moveQuestion(index, 1)}
              >
                <ChevronDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive"
                aria-label="Remove question"
                onClick={() => removeQuestion(q.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          {(q.parts ?? []).length > 0
            ? (
              <div className="space-y-2 pl-4">
                {(q.parts ?? []).map(part => (
                  <div
                    key={part.id}
                    className="flex items-center gap-2"
                  >
                    <Input
                      value={part.label}
                      onChange={e => updatePart(q.id, part.id, e.target.value)}
                      placeholder="Part label, e.g. (a)"
                      aria-label="Part label"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      aria-label="Remove part"
                      onClick={() => removePart(q.id, part.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )
            : null}

          <PartQuickAdd
            existingCount={(q.parts ?? []).length}
            onAddPart={() => addPart(q.id)}
            onAddParts={parts => addParts(q.id, parts)}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={addQuestion}
      >
        <Plus className="size-4" />
        Add question
      </Button>
    </div>
  );
}

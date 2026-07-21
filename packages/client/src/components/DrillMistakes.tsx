import type { DrillMistake } from "@sentence-bank/types";

import { useState } from "react";

import { Plus, Trash2 } from "lucide-react";

import { DrillReasonPicker } from "@/components/DrillReasonPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { newId } from "@/lib/id";

/**
 * The mistake editor for a drill session. Each row captures what was gotten wrong (optional — leave it
 * empty to record a skipped answer), the correct answer (optional), the reasons it's tagged with, and a
 * free-text reflection on *why*. The parent form keeps any row with content and drops only blank ones.
 */
export function DrillMistakes({
  mistakes,
  onChange,
}: {
  mistakes: DrillMistake[];
  onChange: (mistakes: DrillMistake[]) => void;
}) {
  const [bulk, setBulk] = useState("");
  const addMistake = () =>
    onChange([...mistakes, {
      id: newId(),
      question: null,
      prompt: "",
      correctAnswer: null,
      reflection: null,
      reasons: [],
    }]);
  /** Turn each non-blank line of the quick-add box into a mistake row (the line becomes its question). */
  const addBulk = () => {
    const rows: DrillMistake[] = bulk
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(question => ({
        id: newId(),
        question,
        prompt: "",
        correctAnswer: null,
        reflection: null,
        reasons: [],
      }));
    if (rows.length === 0) return;
    onChange([...mistakes, ...rows]);
    setBulk("");
  };
  const patch = (id: string, part: Partial<DrillMistake>) =>
    onChange(mistakes.map(m => (m.id === id
      ? {
        ...m,
        ...part,
      }
      : m)));
  const remove = (id: string) => onChange(mistakes.filter(m => m.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label>Mistakes</Label>
          <p className="text-xs text-muted-foreground">
            One row per thing you got wrong. Tag why, so patterns show up in your stats later.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={addMistake}
        >
          <Plus className="size-4" />
          Add mistake
        </Button>
      </div>

      <div className="space-y-1.5 rounded-md border border-dashed p-3">
        <Label htmlFor="drill-quick-add">Quick add</Label>
        <p className="text-xs text-muted-foreground">
          Paste the questions you got wrong, one per line — each becomes a mistake to flesh out below.
        </p>
        <Textarea
          id="drill-quick-add"
          value={bulk}
          onChange={e => setBulk(e.target.value)}
          placeholder={"食べる → potential form\n〜ば vs 〜たら\n…"}
          rows={3}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={bulk.trim().length === 0}
          onClick={addBulk}
        >
          <Plus className="size-4" />
          Add these
        </Button>
      </div>

      {mistakes.length === 0
        ? <p className="text-sm text-muted-foreground">No mistakes logged yet.</p>
        : (
          <ul className="space-y-3">
            {mistakes.map((m, i) => (
              <li
                key={m.id}
                className="space-y-3 rounded-md border p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Mistake {i + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => remove(m.id)}
                    aria-label="Delete mistake"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label>Question (optional)</Label>
                  <Input
                    value={m.question ?? ""}
                    onChange={e => patch(m.id, {
                      question: e.target.value,
                    })}
                    placeholder="The prompt you were answering, e.g. Conjugate 食べる (potential)"
                    aria-label="Question"
                  />
                </div>

                <div
                  className="
                    grid gap-2
                    sm:grid-cols-2
                  "
                >
                  <div className="space-y-1.5">
                    <Label>What you got wrong (optional)</Label>
                    <Input
                      value={m.prompt}
                      onChange={e => patch(m.id, {
                        prompt: e.target.value,
                      })}
                      placeholder="e.g. 食べれる — leave empty if you skipped it"
                      aria-label="What you got wrong"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Correct answer (optional)</Label>
                    <Input
                      value={m.correctAnswer ?? ""}
                      onChange={e => patch(m.id, {
                        correctAnswer: e.target.value,
                      })}
                      placeholder="e.g. 食べられる"
                      aria-label="Correct answer"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Reasons</Label>
                  <DrillReasonPicker
                    value={m.reasons}
                    onChange={reasons => patch(m.id, {
                      reasons,
                    })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Why did you get it wrong? (optional)</Label>
                  <Textarea
                    value={m.reflection ?? ""}
                    onChange={e => patch(m.id, {
                      reflection: e.target.value,
                    })}
                    placeholder="Lazy? Rushed? A specific tense/conjugation slip? Note it here."
                    aria-label="Reflection"
                    rows={2}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

      {mistakes.length > 0 && (
        <Button
          type="button"
          size="sm"
          onClick={addMistake}
        >
          <Plus className="size-4" />
          Add mistake
        </Button>
      )}
    </div>
  );
}

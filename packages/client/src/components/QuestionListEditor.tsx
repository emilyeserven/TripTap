import type { QuestionLabelStyle } from "@/lib/question-sheet-parts";
import type { QuestionAnswerType, QuestionSheetQuestion } from "@sentence-bank/types";

import { useState } from "react";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { PartsEditor } from "@/components/PartsEditor";
import { QuestionAnswerTypeEditor } from "@/components/QuestionAnswerTypeEditor";
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
import { newSheetItemId, questionLabel } from "@/lib/question-sheet-parts";

/** Quick-fill prompt styles: "blank" leaves prompts empty, the rest prefill a plain running label. */
type QuickFillStyle = "blank" | QuestionLabelStyle;

const QUICK_FILL_STYLES: { value: QuickFillStyle;
  label: string; }[] = [
  {
    value: "blank",
    label: "Blank",
  },
  {
    value: "decimal",
    label: "1, 2, 3",
  },
  {
    value: "upper-alpha",
    label: "A, B, C",
  },
  {
    value: "lower-alpha",
    label: "a, b, c",
  },
  {
    value: "upper-roman",
    label: "I, II, III",
  },
  {
    value: "lower-roman",
    label: "i, ii, iii",
  },
];

/**
 * The "list of questions" editor of the question-sheet form: a quick-fill count box plus a dynamic
 * list of questions, each with reorder/remove controls and labelled parts. The parent owns the
 * questions array; this component owns only the quick-fill input.
 */
export function QuestionListEditor({
  questions,
  onChange,
  firstNumber = 1,
}: {
  questions: QuestionSheetQuestion[];
  onChange: (questions: QuestionSheetQuestion[]) => void;
  /** The number the first question is labelled with, so labels match the sheet's offset. */
  firstNumber?: number;
}) {
  const [quickCount, setQuickCount] = useState("");
  const [quickStyle, setQuickStyle] = useState<QuickFillStyle>("blank");

  function addQuestion() {
    onChange([...questions, {
      id: newSheetItemId("q"),
      prompt: "",
    }]);
  }
  /**
   * Quick-fill: replace the questions with `n` slots. Lets the user say "there are 12 questions"
   * without typing each one — the answer sheet then renders the right number of inputs. With a label
   * style picked, each prompt is prefilled with a running label (worksheets often number their
   * sections "A, B, C" or "I, II, III"); "Blank" leaves them empty (labelled "Question N" via
   * {@link questionSheetSlots}'s positional fallback). Existing questions are replaced (count is authoritative).
   */
  function quickFill() {
    const n = Math.floor(Number(quickCount));
    if (!Number.isFinite(n) || n < 1) return;
    onChange(
      Array.from({
        length: Math.min(n, 200),
      }, (_, i) => ({
        id: newSheetItemId("q"),
        prompt: quickStyle === "blank" ? "" : questionLabel(quickStyle, i),
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
  /** Apply one answer-type patch to every question — the sheet-wide control for a sub-part-less sheet. */
  function setAllAnswerType(patch: { answerType?: QuestionAnswerType;
    choices?: string[]; }) {
    onChange(questions.map(q => ({
      ...q,
      ...patch,
    })));
  }
  function moveQuestion(index: number, delta: number) {
    const next = [...questions];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  // A sheet whose questions all lack sub-parts is uniform: its answer type is set once for the whole
  // sheet (below) rather than per question. Adding sub-parts to any question flips back to per-question
  // control (each question's parts share that question's type). The first question represents the shared
  // type — {@link setAllAnswerType} keeps them in lockstep.
  const hasSubparts = questions.some(q => (q.parts?.length ?? 0) > 0);
  const first = questions[0];

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
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Prefill labels</Label>
          <Select
            value={quickStyle}
            onValueChange={v => setQuickStyle(v as QuickFillStyle)}
          >
            <SelectTrigger
              className="w-28"
              aria-label="Question label style"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUICK_FILL_STYLES.map(s => (
                <SelectItem
                  key={s.value}
                  value={s.value}
                >
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={quickFill}
        >
          Set questions
        </Button>
        <p className="w-full text-xs text-muted-foreground">
          Generates that many questions so the answer sheet has the right number of inputs — you
          don’t have to type each one. Pick a label style (A, B, C / I, II, III / 1, 2, 3…) to
          prefill each question’s prompt, or “Blank” for empty prompts. Editing below still works.
        </p>
      </div>

      {questions.length > 0 && !hasSubparts
        ? (
          <div className="space-y-1.5 rounded-md border border-dashed p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Answer type — applies to every question
            </p>
            <QuestionAnswerTypeEditor
              answerType={first?.answerType}
              choices={first?.choices ?? []}
              onChange={setAllAnswerType}
            />
            <p className="text-xs text-muted-foreground">
              Every question answers the same way. Add sub-parts to a question to give it its own
              answer type.
            </p>
          </div>
        )
        : null}

      {questions.map((q, index) => (
        <div
          key={q.id}
          className="space-y-3 rounded-md border p-4"
        >
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`q-${q.id}`}>Question {firstNumber + index}</Label>
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

          {/* Per-question answer type only once some question has sub-parts; a flat sheet uses the
              single sheet-wide control above instead. */}
          {hasSubparts
            ? (
              <QuestionAnswerTypeEditor
                answerType={q.answerType}
                choices={q.choices ?? []}
                onChange={patch => updateQuestion(q.id, patch)}
              />
            )
            : null}

          <PartsEditor
            parts={q.parts ?? []}
            onChange={parts => updateQuestion(q.id, {
              parts,
            })}
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

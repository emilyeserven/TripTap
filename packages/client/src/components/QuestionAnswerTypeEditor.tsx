import type { QuestionAnswerType } from "@sentence-bank/types";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** The answer-type choices offered when authoring a question, in display order. */
const ANSWER_TYPE_OPTIONS: { value: QuestionAnswerType;
  label: string; }[] = [
  {
    value: "text",
    label: "Text",
  },
  {
    value: "boolean",
    label: "True / False",
  },
  {
    value: "choice",
    label: "Multiple choice",
  },
];

/**
 * Authoring control for one question's answer type. A segmented pill picker chooses free text (the
 * default), a fixed True/False button group, or a multiple-choice group whose options are edited
 * inline. The parent owns `answerType`/`choices`; this only reports patches. When answering, the
 * answer sheet renders the matching input (see {@link questionAnswerChoices}).
 */
export function QuestionAnswerTypeEditor({
  answerType = "text",
  choices,
  onChange,
}: {
  answerType?: QuestionAnswerType;
  choices: string[];
  onChange: (patch: { answerType?: QuestionAnswerType;
    choices?: string[]; }) => void;
}) {
  // Always show at least one option row so a freshly-picked "Multiple choice" has somewhere to type.
  const shownChoices = choices.length > 0 ? choices : [""];
  const setChoice = (index: number, value: string) =>
    onChange({
      choices: shownChoices.map((c, i) => (i === index ? value : c)),
    });

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Answer type</Label>
      <div className="flex flex-wrap gap-1.5">
        {ANSWER_TYPE_OPTIONS.map((opt) => {
          const active = answerType === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({
                answerType: opt.value,
              })}
              className={cn(
                `
                  inline-flex items-center rounded-full border px-2.5 py-1
                  text-xs
                  hover:bg-muted
                `,
                active
                  ? "border-primary bg-primary/10 font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {answerType === "boolean"
        ? (
          <p className="text-xs text-muted-foreground">
            Answered with a True / False button group.
          </p>
        )
        : null}

      {answerType === "choice"
        ? (
          <div className="space-y-1.5">
            {shownChoices.map((choice, index) => (
              <div
                key={index}
                className="flex items-center gap-2"
              >
                <Input
                  value={choice}
                  onChange={e => setChoice(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  aria-label={`Option ${index + 1}`}
                  className="max-w-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  aria-label={`Remove option ${index + 1}`}
                  disabled={shownChoices.length <= 1}
                  onClick={() => onChange({
                    choices: shownChoices.filter((_, i) => i !== index),
                  })}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange({
                choices: [...shownChoices, ""],
              })}
            >
              <Plus className="size-4" />
              Add option
            </Button>
          </div>
        )
        : null}
    </div>
  );
}

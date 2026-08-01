import type { AnswerSheet, QuestionSheet } from "@sentence-bank/types";

import { Check } from "lucide-react";

import { answerSheetParts } from "@/lib/answer-sheets";
import { cn } from "@/lib/utils";

/** Scroll a part's first answer input into view (a no-op if the anchor isn't on the page). */
function jumpToSlot(firstSlotId: string | null) {
  if (!firstSlotId) return;
  globalThis.document.getElementById(`slot-${firstSlotId}`)?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

/**
 * A compact per-part progress row for a multi-part answer sheet: each top-level question shows as a
 * chip with its fill count (or a check when complete), so partial completion ("did part 1, parts 2–3
 * to go") is visible. Clicking a chip jumps to that part's first input. Renders nothing for single-part
 * or grid sheets, where there's nothing to break out.
 */
export function AnswerSheetPartsProgress({
  questionSheet,
  answerSheet,
  activePart,
}: {
  questionSheet: QuestionSheet;
  answerSheet: AnswerSheet;
  activePart?: string | null;
}) {
  const parts = answerSheetParts(questionSheet, answerSheet);
  if (parts.length < 2) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {parts.map((part, i) => (
        <button
          key={part.questionId}
          type="button"
          id={`part-${part.questionId}`}
          onClick={() => jumpToSlot(part.firstSlotId)}
          className={cn(
            `
              inline-flex items-center gap-1 rounded-full border px-2.5 py-1
              text-xs
              hover:bg-muted
            `,
            part.complete && `
              border-emerald-500/50 bg-emerald-500/10 text-emerald-700
              dark:text-emerald-300
            `,
            activePart === part.questionId && "ring-2 ring-primary",
          )}
          title={part.label}
        >
          <span className="font-medium">Part {i + 1}</span>
          {part.complete
            ? <Check className="size-3" />
            : <span className="text-muted-foreground tabular-nums">{part.filled}/{part.total}</span>}
        </button>
      ))}
    </div>
  );
}

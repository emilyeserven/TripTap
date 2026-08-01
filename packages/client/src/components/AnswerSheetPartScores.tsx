import type { AnswerSheet, QuestionSheet } from "@sentence-bank/types";

import { answerSheetPartScores, isAnswerSheetComplete } from "@/lib/answer-sheets";

/** correct/total as a rounded percentage (0 when there's nothing to score). */
function percent(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

/**
 * A per-part score breakdown for a graded, multi-part answer sheet: each in-play part's correct/total
 * (+ %), then a total row. Mirrors {@link AnswerSheetScoreBadge}'s visibility — it appears only once the
 * sheet is complete and grading has started — and skips hidden parts. Single-part and grid sheets show
 * nothing here (the header badge already carries their one score).
 */
export function AnswerSheetPartScores({
  questionSheet,
  answerSheet,
}: {
  questionSheet: QuestionSheet;
  answerSheet: AnswerSheet;
}) {
  // Number parts by sheet position, then drop hidden ones (keeps "Part 2" stable — see the progress row).
  const parts = answerSheetPartScores(questionSheet, answerSheet)
    .map((part, index) => ({
      ...part,
      number: index + 1,
    }))
    .filter(p => !p.hidden);
  if (parts.length < 2) return null;
  if (!isAnswerSheetComplete(questionSheet, answerSheet)) return null;

  const graded = parts.reduce((n, p) => n + p.graded, 0);
  if (graded === 0) return null;

  const correct = parts.reduce((n, p) => n + p.correct, 0);
  const total = parts.reduce((n, p) => n + p.total, 0);

  return (
    <div className="space-y-1 rounded-md border p-3 text-sm">
      <p
        className="
          text-xs font-semibold tracking-wide text-muted-foreground uppercase
        "
      >
        Scores by part
      </p>
      <ul className="space-y-0.5">
        {parts.map(part => (
          <li
            key={part.questionId}
            className="flex items-center justify-between gap-3"
          >
            <span className="truncate">
              <span className="font-medium">Part {part.number}</span>
              <span className="text-muted-foreground"> — {part.label}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              {part.correct}/{part.total} · {percent(part.correct, part.total)}%
            </span>
          </li>
        ))}
      </ul>
      <div
        className="
          flex items-center justify-between gap-3 border-t pt-1 font-medium
        "
      >
        <span>Total</span>
        <span className="tabular-nums">
          {correct}/{total} · {percent(correct, total)}%
        </span>
      </div>
    </div>
  );
}

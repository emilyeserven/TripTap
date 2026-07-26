import type { AnswerSheet, QuestionSheet } from "@sentence-bank/types";

import { Badge } from "@/components/ui/badge";
import { answerSheetScore, isAnswerSheetComplete } from "@/lib/answer-sheets";

/**
 * A score badge for a completed answer sheet: renders nothing until every slot is answered, then shows
 * "Ungraded" until the learner starts grading, and finally "X / Y · Z%" once verdicts exist. Shared by
 * the answer-sheets index card and the single answer-sheet view so the score reads the same everywhere.
 */
export function AnswerSheetScoreBadge({
  questionSheet,
  answerSheet,
}: {
  questionSheet: QuestionSheet;
  answerSheet: AnswerSheet;
}) {
  if (!isAnswerSheetComplete(questionSheet, answerSheet)) return null;

  const {
    correct,
    graded,
    total,
  } = answerSheetScore(questionSheet, answerSheet);

  if (graded === 0) {
    return <Badge variant="outline">Ungraded</Badge>;
  }

  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <Badge variant="secondary">
      Score {correct}/{total}
      {" · "}
      {percent}%
    </Badge>
  );
}

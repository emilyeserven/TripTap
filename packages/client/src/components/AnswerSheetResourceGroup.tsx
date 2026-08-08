import type { AnswerSheet, QuestionSheet } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";

import { AnswerSheetScoreBadge } from "@/components/AnswerSheetScoreBadge";
import { ResourceGroupCard } from "@/components/ResourceGroupCard";

/** One answer-sheet row: its title link, plus the score badge once it's complete and graded. */
function AnswerSheetLink({
  answerSheet: as,
  questionSheet,
}: {
  answerSheet: AnswerSheet;
  questionSheet: QuestionSheet | undefined;
}) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <Link
        to="/answer-sheets/$id"
        params={{
          id: as.id,
        }}
        className="
          min-w-0 flex-1 truncate font-medium
          hover:underline
        "
      >
        › {as.title ?? "Answer sheet"}
      </Link>
      {questionSheet
        ? (
          <AnswerSheetScoreBadge
            questionSheet={questionSheet}
            answerSheet={as}
          />
        )
        : null}
    </li>
  );
}

/**
 * One resource's answer sheets, rendered on the shared {@link ResourceGroupCard} — the answer-sheet
 * counterpart to {@link QuestionSheetResourceGroup}. Each attempt is a compact title link with its
 * score badge; `questionSheetById` resolves an attempt's parent (for scoring) since answer sheets tie
 * to a book only through their question sheet.
 */
export function AnswerSheetResourceGroup({
  bookmarkId,
  bookmarkTitle,
  imageUrl,
  mediaType,
  answerSheets,
  questionSheetById,
}: {
  bookmarkId: string | null;
  bookmarkTitle: string | null;
  imageUrl: string | null;
  mediaType: string | null;
  answerSheets: AnswerSheet[];
  questionSheetById: Map<string, QuestionSheet>;
}) {
  return (
    <ResourceGroupCard
      bookmarkId={bookmarkId}
      bookmarkTitle={bookmarkTitle}
      imageUrl={imageUrl}
      mediaType={mediaType}
    >
      <ul className="space-y-0.5">
        {answerSheets.map(as => (
          <AnswerSheetLink
            key={as.id}
            answerSheet={as}
            questionSheet={questionSheetById.get(as.questionSheetId)}
          />
        ))}
      </ul>
    </ResourceGroupCard>
  );
}

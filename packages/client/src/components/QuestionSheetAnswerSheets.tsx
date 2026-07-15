import { AnswerSheetCard } from "@/components/AnswerSheetCard";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { useAnswerSheetsForQuestionSheet } from "@/hooks/useAnswerSheets";

/**
 * The "Answer Sheets" section on a question sheet's detail page: lists every attempt filled in against
 * this sheet, each linking to its own view. Read-only — a new attempt is started from the header's
 * "Answer this sheet" action, and deleting happens on an answer sheet's own edit page.
 */
export function QuestionSheetAnswerSheets({
  questionSheetId,
}: {
  questionSheetId: string;
}) {
  const {
    data, isLoading,
  } = useAnswerSheetsForQuestionSheet(questionSheetId);
  const shown = data ?? [];
  const nothing = !isLoading && shown.length === 0;

  return (
    <CollapsibleSection title="Answer Sheets">
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {nothing
        ? (
          <p className="text-sm text-muted-foreground">
            No answer sheets yet. Start one with “Answer this sheet”.
          </p>
        )
        : null}
      <div className="space-y-3">
        {shown.map(as => (
          <AnswerSheetCard
            key={as.id}
            answerSheet={as}
          />
        ))}
      </div>
    </CollapsibleSection>
  );
}

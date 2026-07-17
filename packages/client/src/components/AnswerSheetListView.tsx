import type { SaveCorrection } from "@/lib/answer-sheets";
import type { AnswerSheetEntry, QuestionSheetQuestion } from "@sentence-bank/types";

import { AnswerEntry } from "@/components/AnswerEntry";
import { isEntryAnswered } from "@/lib/answer-sheets";

/**
 * List rendering: one card per question, with the question's parts separated inside. A question card
 * appears once any of its slots is answered, and then shows all of the question's parts (unanswered
 * ones read "No answer").
 */
export function AnswerSheetListView({
  questions,
  getEntry,
  markCorrect,
  markWrong,
  editCorrections,
  saveCorrection,
}: {
  questions: QuestionSheetQuestion[];
  getEntry: (slotId: string) => AnswerSheetEntry;
  markCorrect: (slotId: string) => void;
  markWrong: (slotId: string) => void;
  editCorrections: (slotId: string) => void;
  saveCorrection: SaveCorrection;
}) {
  const cards = questions.map((q, i) => {
    const base = q.prompt.trim() || `Question ${i + 1}`;
    const parts = q.parts ?? [];
    const hasParts = parts.length > 0;
    const slots = hasParts
      ? parts.map(p => ({
        id: p.id,
        label: p.label as string | null,
      }))
      : [{
        id: q.id,
        label: null as string | null,
      }];
    return {
      key: q.id || `q${i}`,
      base,
      hasParts,
      slots,
      anyAnswered: slots.some(s => isEntryAnswered(getEntry(s.id))),
    };
  }).filter(c => c.anyAnswered);

  if (cards.length === 0) {
    return <p className="text-sm text-muted-foreground">No answers recorded.</p>;
  }

  return (
    <div className="space-y-3">
      {cards.map(c => (
        <div
          key={c.key}
          className="space-y-2 rounded-md border p-3"
        >
          {c.hasParts ? <p className="text-sm font-medium">{c.base}</p> : null}
          <div className={c.hasParts ? "divide-y" : undefined}>
            {c.slots.map(s => (
              <div
                key={s.id}
                className={c.hasParts
                  ? `
                    py-3
                    first:pt-0
                    last:pb-0
                  `
                  : undefined}
              >
                <AnswerEntry
                  slotId={s.id}
                  label={c.hasParts ? s.label : c.base}
                  entry={getEntry(s.id)}
                  markCorrect={markCorrect}
                  markWrong={markWrong}
                  editCorrections={editCorrections}
                  saveCorrection={saveCorrection}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

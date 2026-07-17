import type { AnswerSheetEntry, QuestionSheet } from "@sentence-bank/types";

import { AnswerHoverActions } from "@/components/AnswerHoverActions";

/** Grid rendering: a labelled table with per-cell hover actions; flagged cells are highlighted. */
export function AnswerSheetGridView({
  grid,
  getEntry,
  markCorrect,
  markWrong,
}: {
  grid: NonNullable<QuestionSheet["grid"]>;
  getEntry: (slotId: string) => AnswerSheetEntry;
  markCorrect: (slotId: string) => void;
  markWrong: (slotId: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border p-2 text-left font-medium" />
            {grid.columns.map((col, i) => (
              <th
                key={i}
                className="border p-2 text-left font-medium"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map(row => (
            <tr key={row.id}>
              <th className="border p-2 text-left font-medium">{row.label}</th>
              {grid.columns.map((_, colIndex) => {
                const slotId = `${row.id}:${colIndex}`;
                const entry = getEntry(slotId);
                const corrected = entry.correction?.trim() ? entry.correction : null;
                return (
                  <td
                    key={colIndex}
                    className={!corrected && entry.correct === false
                      ? "border p-1 text-destructive"
                      : "border p-1"}
                  >
                    <div
                      className="
                        group flex min-h-7 items-center justify-between gap-2
                        px-1
                      "
                    >
                      <span
                        title={corrected && entry.value.trim()
                          ? `Your original: ${entry.value}`
                          : undefined}
                      >
                        {corrected ?? entry.value ?? ""}
                        {!corrected && !entry.value.trim()
                          ? <span className="text-muted-foreground">—</span>
                          : null}
                      </span>
                      <AnswerHoverActions
                        slotId={slotId}
                        correct={entry.correct}
                        markCorrect={markCorrect}
                        markWrong={markWrong}
                      />
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

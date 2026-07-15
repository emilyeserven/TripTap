import type { SentenceMark } from "@sentence-bank/types";

import { markRuns } from "@/lib/sentenceMarks";

/** Tint classes for a marked span — correct (green, kept) / incorrect (red strikethrough, dropped). */
export const MARK_CORRECT_CLASS = `
  rounded-sm bg-emerald-500/15 text-emerald-700
  dark:text-emerald-400
`;
export const MARK_INCORRECT_CLASS = "rounded-sm text-destructive line-through decoration-destructive/60";

/** Read-only render of `text` with its correct/incorrect span marks tinted inline. */
export function MarkedText({
  text,
  marks,
  className,
}: {
  text: string;
  marks: SentenceMark[];
  className?: string;
}) {
  const runs = markRuns(text, marks);
  return (
    <span className={className}>
      {runs.map(r => (
        <span
          key={r.start}
          className={r.correct === true
            ? MARK_CORRECT_CLASS
            : r.correct === false
              ? MARK_INCORRECT_CLASS
              : undefined}
        >
          {text.slice(r.start, r.end)}
        </span>
      ))}
    </span>
  );
}

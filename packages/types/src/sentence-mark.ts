/**
 * A learner-marked span of a sentence's original text: a half-open character range `[start, end)` into
 * that text, tagged `correct` (the span is right) or not (`correct: false` — the span is wrong and is
 * dropped from the derived correction). Marks are kept non-overlapping. Shared by {@link AnswerSheetEntry}
 * (offsets into `value`) and {@link MySentence} (offsets into `text`).
 */
export interface SentenceMark {
  start: number;
  end: number;
  correct: boolean;
}

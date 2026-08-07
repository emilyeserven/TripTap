/**
 * A learner-marked span of a sentence's original text: a half-open character range `[start, end)` into
 * that text, tagged `correct` (the span is right) or not (`correct: false` — the span is wrong and is
 * dropped from the derived correction). Marks are kept non-overlapping. Shared by {@link AnswerSheetEntry}
 * (offsets into `value`) and {@link MySentence} (offsets into `text`).
 */
import { z } from "zod";

import { anyInt } from "./json-schema.js";

export interface SentenceMark {
  start: number;
  end: number;
  correct: boolean;
}

/**
 * A learner-marked span, as a route body accepts it. Shared by every surface that stores marks —
 * writings' corrections, my-sentences, answer-sheet entries — which each carried their own copy.
 */
export const sentenceMarkSchema = z.object({
  start: anyInt(),
  end: anyInt(),
  correct: z.boolean(),
});

/**
 * One filled-in answer for a single slot of the referenced {@link QuestionSheet}. Only slots the user
 * has touched get an entry. The correction fields mirror the {@link MySentence} entity's phrasing:
 * `intendedMeaning` = what the learner meant to say, `actualMeaning` = what the answer actually says,
 * `correction` = the corrected answer, `reasoning` = why it was wrong. `correct` records the review
 * verdict: `true` = marked correct, `false` = marked wrong, `null`/absent = not yet reviewed.
 */
export interface AnswerSheetEntry {
  slotId: string;
  value: string;
  correct: boolean | null;
  correction: string | null;
  reasoning: string | null;
  intendedMeaning: string | null;
  actualMeaning: string | null;
}

/**
 * One filled-in attempt at a {@link QuestionSheet}. A question sheet can have many answer sheets (the
 * "reusable" part). Answers and corrections are stored together as a flexible JSONB array of
 * {@link AnswerSheetEntry}.
 */
export interface AnswerSheet {
  id: string;
  questionSheetId: string;
  title: string | null;
  entries: AnswerSheetEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnswerSheetInput {
  questionSheetId: string;
  title?: string | null;
  entries?: AnswerSheetEntry[];
}

export type UpdateAnswerSheetInput = Partial<CreateAnswerSheetInput>;

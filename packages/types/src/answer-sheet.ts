import type { SentenceMark } from "./sentence-mark.js";

import { z } from "zod";

import { anyInt, objectJsonSchema } from "./json-schema.js";

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
  /** Learner-marked correct/incorrect spans of `value` (offsets into the original answer); null if none. */
  marks: SentenceMark[] | null;
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
  /**
   * The date this attempt is assigned to (ISO string), e.g. the day it was answered. Used to decide
   * whether it meets the question sheet's due date; `null` if the learner hasn't dated it.
   */
  date: string | null;
  entries: AnswerSheetEntry[];
  /**
   * Ids of top-level question "parts" the learner has hidden for this attempt (e.g. only doing Part 2).
   * Their slots are dropped from the editor and excluded from the score/completeness tally, but any
   * answers already recorded for them are kept so unhiding restores them. `null`/empty = every part is
   * in play.
   */
  hiddenPartIds: string[] | null;
  createdAt: string;
  updatedAt: string;
}

const answerSheetEntrySchema = z.object({
  slotId: z.string(),
  value: z.string(),
  correct: z.boolean().nullable().optional(),
  correction: z.string().nullable().optional(),
  reasoning: z.string().nullable().optional(),
  intendedMeaning: z.string().nullable().optional(),
  actualMeaning: z.string().nullable().optional(),
  marks: z.array(z.object({
    start: anyInt(),
    end: anyInt(),
    correct: z.boolean(),
  })).nullable().optional(),
});

export const createAnswerSheetSchema = z.object({
  questionSheetId: z.guid(),
  title: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  entries: z.array(answerSheetEntrySchema).optional(),
  hiddenPartIds: z.array(z.string()).nullable().optional(),
});

/** JSON Schema (draft-07) for the create payload, used verbatim as the route body. */
export const createAnswerSheetJsonSchema = objectJsonSchema(createAnswerSheetSchema);

/**
 * `entries` is overridden rather than inferred, and the reason is a latent mismatch worth naming:
 * the route has only ever required `slotId` and `value` on an entry, while {@link AnswerSheetEntry}
 * declares every field (nullable, but present). Inferring would loosen the stored type across every
 * reader; narrowing the schema would start rejecting partial entries the API accepts today. Neither
 * belongs in a mechanical conversion, so both sides keep what they have — the same call made for
 * `SentenceTermRef.category` before it was resolved deliberately in #267.
 */
export type CreateAnswerSheetInput = Omit<z.infer<typeof createAnswerSheetSchema>, "entries"> & {
  entries?: AnswerSheetEntry[];
};

export type UpdateAnswerSheetInput = Partial<CreateAnswerSheetInput>;

import { z } from "zod";

import { QUESTION_ANSWER_TYPES } from "./question-sheet.js";

/**
 * The JSON an AI assistant returns when asked to read photos/screenshots of a textbook exercise and
 * turn them into a question sheet. It is deliberately **id-free** and lenient (most fields optional):
 * the client assigns ids and merges the result into the question-sheet form, so the user still reviews
 * everything before saving. The prompt that asks for this shape lives in the client
 * (`lib/question-sheet-import.ts`) next to the converter, so the two are edited together.
 */
export interface QuestionSheetImportPart {
  label: string;
  text?: string;
  parts?: QuestionSheetImportPart[];
}

const importPartSchema: z.ZodType<QuestionSheetImportPart> = z.lazy(() => z.object({
  label: z.string(),
  text: z.string().optional(),
  parts: z.array(importPartSchema).optional(),
}));

const importQuestionSchema = z.object({
  prompt: z.string().optional(),
  answerType: z.enum(QUESTION_ANSWER_TYPES).optional(),
  choices: z.array(z.string()).optional(),
  parts: z.array(importPartSchema).optional(),
});

export const questionSheetImportSchema = z.object({
  title: z.string().optional(),
  page: z.string().optional(),
  notes: z.string().optional(),
  firstQuestionNumber: z.number().int().min(1).optional(),
  layout: z.enum(["list", "grid"]).optional(),
  questions: z.array(importQuestionSchema).optional(),
  grid: z.object({
    columns: z.array(z.string()),
    rows: z.array(z.string()),
  }).optional(),
});

export type QuestionSheetImport = z.infer<typeof questionSheetImportSchema>;

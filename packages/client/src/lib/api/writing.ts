/** Writing-flow APIs: writings, writing prompts, question/answer sheets, and grammar notes. */
import type {
  Writing,
  CreateWritingInput,
  UpdateWritingInput,
  QuestionSheet,
  CreateQuestionSheetInput,
  UpdateQuestionSheetInput,
  AnswerSheet,
  CreateAnswerSheetInput,
  UpdateAnswerSheetInput,
  GrammarNote,
  CreateGrammarNoteInput,
  UpdateGrammarNoteInput,
  WritingPrompt,
  CreateWritingPromptInput,
  UpdateWritingPromptInput,
} from "@sentence-bank/types";

import { crudApi } from "./crud";
import { request } from "./request";

export const writingsApi = crudApi<Writing, CreateWritingInput, UpdateWritingInput>("/writings");

export const writingPromptsApi = {
  list: () => request<WritingPrompt[]>("/writing-prompts"),
  get: (id: string) => request<WritingPrompt>(`/writing-prompts/${id}`),
  create: (input: CreateWritingPromptInput) =>
    request<WritingPrompt>("/writing-prompts", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createMany: (inputs: CreateWritingPromptInput[]) =>
    request<WritingPrompt[]>("/writing-prompts/bulk", {
      method: "POST",
      body: JSON.stringify({
        writingPrompts: inputs,
      }),
    }),
  update: (id: string, input: UpdateWritingPromptInput) =>
    request<WritingPrompt>(`/writing-prompts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/writing-prompts/${id}`, {
    method: "DELETE",
  }),
};

export const questionSheetsApi = crudApi<QuestionSheet, CreateQuestionSheetInput, UpdateQuestionSheetInput>("/question-sheets");

export const answerSheetsApi = {
  ...crudApi<AnswerSheet, CreateAnswerSheetInput, UpdateAnswerSheetInput>("/answer-sheets"),
  /** Optionally scoped to one question sheet. */
  list: (filters?: { questionSheetId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.questionSheetId) params.set("questionSheetId", filters.questionSheetId);
    const qs = params.toString();
    return request<AnswerSheet[]>(`/answer-sheets${qs ? `?${qs}` : ""}`);
  },
};

export const grammarNotesApi = {
  list: () => request<GrammarNote[]>("/grammar-notes"),
  get: (id: string) => request<GrammarNote>(`/grammar-notes/${id}`),
  getByTag: (tagId: string) =>
    request<GrammarNote>(`/grammar-notes/by-tag/${encodeURIComponent(tagId)}`),
  create: (input: CreateGrammarNoteInput) =>
    request<GrammarNote>("/grammar-notes", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateGrammarNoteInput) =>
    request<GrammarNote>(`/grammar-notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/grammar-notes/${id}`, {
    method: "DELETE",
  }),
};

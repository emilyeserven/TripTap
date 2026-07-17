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

import { request } from "./request";

export const writingsApi = {
  list: () => request<Writing[]>("/writings"),
  get: (id: string) => request<Writing>(`/writings/${id}`),
  create: (input: CreateWritingInput) =>
    request<Writing>("/writings", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateWritingInput) =>
    request<Writing>(`/writings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/writings/${id}`, {
    method: "DELETE",
  }),
};

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

export const questionSheetsApi = {
  list: () => request<QuestionSheet[]>("/question-sheets"),
  get: (id: string) => request<QuestionSheet>(`/question-sheets/${id}`),
  create: (input: CreateQuestionSheetInput) =>
    request<QuestionSheet>("/question-sheets", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateQuestionSheetInput) =>
    request<QuestionSheet>(`/question-sheets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/question-sheets/${id}`, {
    method: "DELETE",
  }),
};

export const answerSheetsApi = {
  list: (filters?: { questionSheetId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.questionSheetId) params.set("questionSheetId", filters.questionSheetId);
    const qs = params.toString();
    return request<AnswerSheet[]>(qs ? `/answer-sheets?${qs}` : "/answer-sheets");
  },
  get: (id: string) => request<AnswerSheet>(`/answer-sheets/${id}`),
  create: (input: CreateAnswerSheetInput) =>
    request<AnswerSheet>("/answer-sheets", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateAnswerSheetInput) =>
    request<AnswerSheet>(`/answer-sheets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/answer-sheets/${id}`, {
    method: "DELETE",
  }),
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

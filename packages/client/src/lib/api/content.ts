/** Bank-content APIs: sentences, practice sentences, my sentences, vocab, and sources. */
import type {
  CreatePracticeSentenceInput,
  CreateSentenceInput,
  CreateSourceInput,
  CreateVocabInput,
  CreateMySentenceInput,
  MySentence,
  PracticeSentence,
  Sentence,
  Source,
  UpdateMySentenceInput,
  UpdatePracticeSentenceInput,
  UpdateSentenceInput,
  UpdateSourceInput,
  UpdateVocabInput,
  Vocab,
} from "@sentence-bank/types";

import { BASE, request } from "./request";

export const sentencesApi = {
  list: () => request<Sentence[]>("/sentences"),
  create: (input: CreateSentenceInput) =>
    request<Sentence>("/sentences", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createMany: (inputs: CreateSentenceInput[]) =>
    request<Sentence[]>("/sentences/bulk", {
      method: "POST",
      body: JSON.stringify({
        sentences: inputs,
      }),
    }),
  update: (id: string, input: UpdateSentenceInput) =>
    request<Sentence>(`/sentences/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/sentences/${id}`, {
    method: "DELETE",
  }),
  getVocab: (id: string) => request<Vocab[]>(`/sentences/${id}/vocab`),
  setVocab: (id: string, vocabIds: string[]) =>
    request<Vocab[]>(`/sentences/${id}/vocab`, {
      method: "PUT",
      body: JSON.stringify({
        vocabIds,
      }),
    }),
  backfillFurigana: () =>
    request<{ updated: number;
      errors: number; }>("/sentences/furigana/backfill", {
      method: "POST",
    }),
  regenerateFurigana: (id: string) =>
    request<Sentence>(`/sentences/${id}/furigana`, {
      method: "POST",
    }),
  /** Absolute path to a sentence's stored audio/image (present only when `hasAudio`/`hasImage`). */
  audioUrl: (id: string) => `${BASE}/sentences/${id}/audio`,
  imageUrl: (id: string) => `${BASE}/sentences/${id}/image`,
};

export const practiceSentencesApi = {
  list: () => request<PracticeSentence[]>("/practice-sentences"),
  get: (id: string) => request<PracticeSentence>(`/practice-sentences/${id}`),
  create: (input: CreatePracticeSentenceInput) =>
    request<PracticeSentence>("/practice-sentences", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createMany: (inputs: CreatePracticeSentenceInput[]) =>
    request<PracticeSentence[]>("/practice-sentences/bulk", {
      method: "POST",
      body: JSON.stringify({
        practiceSentences: inputs,
      }),
    }),
  update: (id: string, input: UpdatePracticeSentenceInput) =>
    request<PracticeSentence>(`/practice-sentences/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/practice-sentences/${id}`, {
    method: "DELETE",
  }),
  getVocab: (id: string) => request<Vocab[]>(`/practice-sentences/${id}/vocab`),
  setVocab: (id: string, vocabIds: string[]) =>
    request<Vocab[]>(`/practice-sentences/${id}/vocab`, {
      method: "PUT",
      body: JSON.stringify({
        vocabIds,
      }),
    }),
};

export const mySentencesApi = {
  list: (filters?: { practiceSentenceId?: string;
    lessonId?: string; }) => {
    const params = new URLSearchParams();
    if (filters?.practiceSentenceId) params.set("practiceSentenceId", filters.practiceSentenceId);
    if (filters?.lessonId) params.set("lessonId", filters.lessonId);
    const qs = params.toString();
    return request<MySentence[]>(qs ? `/my-sentences?${qs}` : "/my-sentences");
  },
  get: (id: string) => request<MySentence>(`/my-sentences/${id}`),
  create: (input: CreateMySentenceInput) =>
    request<MySentence>("/my-sentences", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createMany: (inputs: CreateMySentenceInput[]) =>
    request<MySentence[]>("/my-sentences/bulk", {
      method: "POST",
      body: JSON.stringify({
        mySentences: inputs,
      }),
    }),
  update: (id: string, input: UpdateMySentenceInput) =>
    request<MySentence>(`/my-sentences/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/my-sentences/${id}`, {
    method: "DELETE",
  }),
};

export const vocabApi = {
  list: () => request<Vocab[]>("/vocab"),
  create: (input: CreateVocabInput) =>
    request<Vocab>("/vocab", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createMany: (inputs: CreateVocabInput[]) =>
    request<Vocab[]>("/vocab/bulk", {
      method: "POST",
      body: JSON.stringify({
        vocab: inputs,
      }),
    }),
  update: (id: string, input: UpdateVocabInput) =>
    request<Vocab>(`/vocab/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/vocab/${id}`, {
    method: "DELETE",
  }),
  sentences: (id: string) => request<Sentence[]>(`/vocab/${id}/sentences`),
  /** Absolute path to a vocab item's stored audio/image (present only when `hasAudio`/`hasImage`). */
  audioUrl: (id: string) => `${BASE}/vocab/${id}/audio`,
  imageUrl: (id: string) => `${BASE}/vocab/${id}/image`,
};

export const sourcesApi = {
  list: () => request<Source[]>("/sources"),
  create: (input: CreateSourceInput) =>
    request<Source>("/sources", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateSourceInput) =>
    request<Source>(`/sources/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/sources/${id}`, {
    method: "DELETE",
  }),
};

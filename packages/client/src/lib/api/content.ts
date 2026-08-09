/** Bank-content APIs: sentences, practice sentences, my sentences, vocab, sources, and shadowing lists. */
import type {
  CreatePracticeSentenceInput,
  CreateSentenceInput,
  CreateShadowingListInput,
  CreateSourceInput,
  CreateVocabInput,
  CreateMySentenceInput,
  KanjiDetail,
  KanjiListQuery,
  KanjiSummary,
  MySentence,
  PracticeSentence,
  PracticeSentenceImportInput,
  Sentence,
  ShadowingList,
  Source,
  UpdateMySentenceInput,
  UpdatePracticeSentenceInput,
  UpdateSentenceInput,
  UpdateShadowingListInput,
  UpdateKanjiStatusInput,
  UpdateSourceInput,
  UpdateVocabInput,
  Vocab,
} from "@sentence-bank/types";

import { crudApi } from "./crud";
import { BASE, request, uploadFile } from "./request";

/**
 * The shared `getVocab`/`setVocab` endpoints for a resource that links vocab via
 * `/<resource>/:id/vocab` (sentences and practice sentences expose the identical pair).
 */
function vocabEndpoints(resource: string) {
  return {
    getVocab: (id: string) => request<Vocab[]>(`/${resource}/${id}/vocab`),
    setVocab: (id: string, vocabIds: string[]) =>
      request<Vocab[]>(`/${resource}/${id}/vocab`, {
        method: "PUT",
        body: JSON.stringify({
          vocabIds,
        }),
      }),
  };
}

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
  ...vocabEndpoints("sentences"),
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
  import: (input: PracticeSentenceImportInput) =>
    request<PracticeSentence>("/practice-sentences/import", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  uploadImage: (id: string, file: File) =>
    uploadFile<PracticeSentence>(`/practice-sentences/${id}/image`, file),
  removeImage: (id: string) => request<undefined>(`/practice-sentences/${id}/image`, {
    method: "DELETE",
  }),
  remove: (id: string) => request<undefined>(`/practice-sentences/${id}`, {
    method: "DELETE",
  }),
  ...vocabEndpoints("practice-sentences"),
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

export const shadowingListsApi = crudApi<ShadowingList, CreateShadowingListInput, UpdateShadowingListInput>("/shadowing-lists");

/**
 * The Kanji tracker. Not `crudApi()`: there is nothing to create or delete — the grid is derived
 * from the corpus — the key is a character rather than a uuid, and the list takes filters.
 */
export const kanjiApi = {
  list: (query: KanjiListQuery = {}) => {
    const params = new URLSearchParams();
    if (query.status) params.set("status", query.status);
    if (query.kind) params.set("kind", query.kind);
    if (query.minOccurrences != null) params.set("minOccurrences", String(query.minOccurrences));
    if (query.sort) params.set("sort", query.sort);
    const qs = params.toString();
    return request<KanjiSummary[]>(`/kanji${qs ? `?${qs}` : ""}`);
  },
  get: (char: string) => request<KanjiDetail>(`/kanji/${encodeURIComponent(char)}`),
  setStatus: (char: string, input: UpdateKanjiStatusInput) =>
    request<KanjiDetail>(`/kanji/${encodeURIComponent(char)}/status`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
};

/** Bank-content APIs: sentences (all kinds), vocab, sources, and shadowing lists. */
import type {
  CreateSentenceInput,
  CreateShadowingListInput,
  CreateSourceInput,
  CreateVocabInput,
  KanjiDetail,
  KanjiListQuery,
  KanjiSummary,
  Sentence,
  SentenceImportInput,
  SentenceKind,
  ShadowingList,
  Source,
  UpdateSentenceInput,
  UpdateShadowingListInput,
  UpdateKanjiStatusInput,
  UpdateSourceInput,
  UpdateVocabInput,
  Vocab,
} from "@sentence-bank/types";

import { crudApi } from "./crud";
import { BASE, request, uploadFile } from "./request";

/** Optional narrowing for the sentence list; every field is a query param, all combine with AND. */
export interface SentenceListFilters {
  /** One kind or several; omitted = all kinds. */
  kind?: SentenceKind | SentenceKind[];
  /** Rows derived from this sentence (a practice card's outputs, a bank sentence's cards). */
  derivedFromId?: string;
  lessonId?: string;
  writingId?: string;
  captureId?: string;
  needsCorrection?: boolean;
  shadowingCandidate?: boolean;
}

/** The query string for a filtered sentence list ("" when unfiltered). */
function sentenceListQuery(filters: SentenceListFilters = {}): string {
  const params = new URLSearchParams();
  const kinds = filters.kind == null ? [] : Array.isArray(filters.kind) ? filters.kind : [filters.kind];
  if (kinds.length > 0) params.set("kind", kinds.join(","));
  if (filters.derivedFromId) params.set("derivedFromId", filters.derivedFromId);
  if (filters.lessonId) params.set("lessonId", filters.lessonId);
  if (filters.writingId) params.set("writingId", filters.writingId);
  if (filters.captureId) params.set("captureId", filters.captureId);
  if (filters.needsCorrection !== undefined) params.set("needsCorrection", String(filters.needsCorrection));
  if (filters.shadowingCandidate !== undefined) params.set("shadowingCandidate", String(filters.shadowingCandidate));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const sentencesApi = {
  list: (filters: SentenceListFilters = {}) =>
    request<Sentence[]>(`/sentences${sentenceListQuery(filters)}`),
  get: (id: string) => request<Sentence>(`/sentences/${id}`),
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
  /** Import a pasted AI breakdown as one practice-kind sentence. */
  import: (input: SentenceImportInput) =>
    request<Sentence>("/sentences/import", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  getVocab: (id: string) => request<Vocab[]>(`/sentences/${id}/vocab`),
  setVocab: (id: string, vocabIds: string[]) =>
    request<Vocab[]>(`/sentences/${id}/vocab`, {
      method: "PUT",
      body: JSON.stringify({
        vocabIds,
      }),
    }),
  /** Upload (or replace) the inline context screenshot. */
  uploadImage: (id: string, file: File) =>
    uploadFile<Sentence>(`/sentences/${id}/image`, file),
  removeImage: (id: string) => request<undefined>(`/sentences/${id}/image`, {
    method: "DELETE",
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

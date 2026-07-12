import type {
  BookmarkRecord,
  BookmarksSettings,
  BookmarksTaxonomy,
  Capture,
  CaptureSummary,
  CleanedBlocks,
  CreateCaptureInput,
  CreateParseTemplateInput,
  CreatePracticeSentenceInput,
  CreateSentenceInput,
  CreateSourceInput,
  CreateVocabInput,
  CreateMySentenceInput,
  CreateListeningSessionInput,
  CreateShadowingSessionInput,
  ListeningSession,
  ShadowingSession,
  UpdateListeningSessionInput,
  UpdateShadowingSessionInput,
  LessonContent,
  LessonDetail,
  LessonImportInput,
  LessonSummary,
  MySentence,
  OcrResult,
  OcrSettings,
  ParseTemplate,
  PracticeSentence,
  Sentence,
  SentenceTermCategory,
  Source,
  TagTermOption,
  UpdateBookmarksSettingsInput,
  UpdateMySentenceInput,
  UpdateOcrSettingsInput,
  UpdatePracticeSentenceInput,
  UpdateSentenceInput,
  UpdateSourceInput,
  UpdateVocabInput,
  Vocab,
  VocabItem,
  VocabRenshuuUpdate,
  Writing,
  CreateWritingInput,
  UpdateWritingInput,
} from "@sentence-bank/types";

/** Patchable capture fields (mirror of the middleware's `UpdateCaptureInput`). */
export interface UpdateCaptureInput {
  title?: string | null;
  cleanedText?: string | null;
  cleanedBlocks?: CleanedBlocks | null;
  notes?: string | null;
  sourceId?: string | null;
  page?: string | null;
  status?: "new" | "parsed";
}

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body
        ? {
          "Content-Type": "application/json",
        }
        : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Request failed with ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
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
  list: (practiceSentenceId?: string) =>
    request<MySentence[]>(
      practiceSentenceId
        ? `/my-sentences?practiceSentenceId=${practiceSentenceId}`
        : "/my-sentences",
    ),
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

export const listeningSessionsApi = {
  list: () => request<ListeningSession[]>("/listening-sessions"),
  get: (id: string) => request<ListeningSession>(`/listening-sessions/${id}`),
  create: (input: CreateListeningSessionInput) =>
    request<ListeningSession>("/listening-sessions", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateListeningSessionInput) =>
    request<ListeningSession>(`/listening-sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/listening-sessions/${id}`, {
    method: "DELETE",
  }),
};

export const shadowingSessionsApi = {
  list: () => request<ShadowingSession[]>("/shadowing-sessions"),
  get: (id: string) => request<ShadowingSession>(`/shadowing-sessions/${id}`),
  create: (input: CreateShadowingSessionInput) =>
    request<ShadowingSession>("/shadowing-sessions", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateShadowingSessionInput) =>
    request<ShadowingSession>(`/shadowing-sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/shadowing-sessions/${id}`, {
    method: "DELETE",
  }),
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
};

export const parseTemplatesApi = {
  list: () => request<ParseTemplate[]>("/parse-templates"),
  create: (input: CreateParseTemplateInput) =>
    request<ParseTemplate>("/parse-templates", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/parse-templates/${id}`, {
    method: "DELETE",
  }),
};

export const ocrApi = {
  // Uploads a raw image as multipart/form-data — it deliberately bypasses `request()`, which
  // hard-codes a JSON content type; the browser sets the multipart boundary itself.
  recognize: async (file: File): Promise<OcrResult> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/ocr`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message ?? `Request failed with ${res.status}`);
    }
    return (await res.json()) as OcrResult;
  },
};

export const capturesApi = {
  list: () => request<CaptureSummary[]>("/captures"),
  get: (id: string) => request<Capture>(`/captures/${id}`),
  update: (id: string, input: UpdateCaptureInput) =>
    request<Capture>(`/captures/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/captures/${id}`, {
    method: "DELETE",
  }),
  /** Sentences and vocab mined from this capture. */
  sentences: (id: string) => request<Sentence[]>(`/captures/${id}/sentences`),
  vocab: (id: string) => request<Vocab[]>(`/captures/${id}/vocab`),
  /** Persist a manual order for this capture's sentences; returns the reordered list. */
  reorderSentences: (id: string, sentenceIds: string[]) =>
    request<Sentence[]>(`/captures/${id}/sentences/order`, {
      method: "PUT",
      body: JSON.stringify({
        sentenceIds,
      }),
    }),
  /** Absolute path to a capture's stored image (or `null` when it has none). */
  imageUrl: (id: string) => `${BASE}/captures/${id}/image`,
  // Multipart upload: the OCR result + metadata as a JSON `payload` field, the image as `file`.
  // Bypasses `request()` for the same reason as `ocrApi.recognize`.
  create: async (input: CreateCaptureInput, image: Blob | null): Promise<Capture> => {
    const form = new FormData();
    form.append("payload", JSON.stringify(input));
    if (image) form.append("file", image, "capture.jpg");
    const res = await fetch(`${BASE}/captures`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message ?? `Request failed with ${res.status}`);
    }
    return (await res.json()) as Capture;
  },
};

export const settingsApi = {
  getOcr: () => request<OcrSettings>("/settings/ocr"),
  updateOcr: (input: UpdateOcrSettingsInput) =>
    request<OcrSettings>("/settings/ocr", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  getBookmarks: () => request<BookmarksSettings>("/settings/bookmarks"),
  updateBookmarks: (input: UpdateBookmarksSettingsInput) =>
    request<BookmarksSettings>("/settings/bookmarks", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
};

/** Read-only proxy to the external bookmarks tag/taxonomy API (all calls go server-side). */
export const bookmarksApi = {
  tags: () => request<TagTermOption[]>("/bookmarks/tags"),
  taxonomies: () => request<BookmarksTaxonomy[]>("/bookmarks/taxonomies"),
  terms: (taxonomyId: string) =>
    request<TagTermOption[]>(`/bookmarks/taxonomies/${taxonomyId}/terms`),
  vocabulary: (category?: SentenceTermCategory) =>
    request<TagTermOption[]>(`/bookmarks/vocabulary${category ? `?category=${category}` : ""}`),
  createTerm: (input: { name: string;
    category: SentenceTermCategory; }) =>
    request<TagTermOption>("/bookmarks/terms", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  /** Bookmarks tagged with the given tag id (sections omitted). */
  records: (tagId: string) =>
    request<BookmarkRecord[]>(`/bookmarks/records?tagId=${encodeURIComponent(tagId)}`),
  /** A single bookmark with its flattened timestamp sections. */
  record: (id: string) => request<BookmarkRecord>(`/bookmarks/records/${encodeURIComponent(id)}`),
};

export const lessonsApi = {
  list: () => request<LessonSummary[]>("/lessons"),
  content: () => request<LessonContent>("/lesson-content"),
  getBySlug: (slug: string) => request<LessonDetail>(`/lessons/${slug}`),
  import: (input: LessonImportInput) =>
    request<LessonDetail>("/lessons/import", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/lessons/${id}`, {
    method: "DELETE",
  }),
  updateVocab: (id: string, patch: VocabRenshuuUpdate) =>
    request<VocabItem>(`/lesson-vocab/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
};

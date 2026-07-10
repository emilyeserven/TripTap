import type {
  CreateSentenceInput,
  LessonContent,
  LessonDetail,
  LessonImportInput,
  LessonSummary,
  OcrResult,
  OcrSettings,
  Sentence,
  UpdateOcrSettingsInput,
  UpdateSentenceInput,
  VocabItem,
  VocabRenshuuUpdate,
} from "@sentence-bank/types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
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
  update: (id: string, input: UpdateSentenceInput) =>
    request<Sentence>(`/sentences/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/sentences/${id}`, {
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

export const settingsApi = {
  getOcr: () => request<OcrSettings>("/settings/ocr"),
  updateOcr: (input: UpdateOcrSettingsInput) =>
    request<OcrSettings>("/settings/ocr", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
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

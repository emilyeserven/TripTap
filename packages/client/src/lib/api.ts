import type {
  Capture,
  CaptureSummary,
  CreateCaptureInput,
  CreateParseTemplateInput,
  CreateSentenceInput,
  CreateSourceInput,
  CreateVocabInput,
  LessonContent,
  LessonDetail,
  LessonImportInput,
  LessonSummary,
  OcrResult,
  OcrSettings,
  ParseTemplate,
  Sentence,
  Source,
  UpdateOcrSettingsInput,
  UpdateSentenceInput,
  Vocab,
  VocabItem,
  VocabRenshuuUpdate,
} from "@sentence-bank/types";

/** Patchable capture fields (mirror of the middleware's `UpdateCaptureInput`). */
export interface UpdateCaptureInput {
  title?: string | null;
  notes?: string | null;
  sourceId?: string | null;
  page?: string | null;
  status?: "new" | "parsed";
}

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
};

export const sourcesApi = {
  list: () => request<Source[]>("/sources"),
  create: (input: CreateSourceInput) =>
    request<Source>("/sources", {
      method: "POST",
      body: JSON.stringify(input),
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

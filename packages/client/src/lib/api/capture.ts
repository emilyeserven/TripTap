/** Capture-workbench APIs: captures, OCR, parse templates, and Migaku imports. */
import type {
  Capture,
  CaptureSummary,
  CleanedBlocks,
  CreateCaptureInput,
  CreateParseTemplateInput,
  OcrResult,
  ParseTemplate,
  Sentence,
  Vocab,
  MigakuImport,
  MigakuImportDetail,
  CommitMigakuImportInput,
  CommitMigakuImportResult,
  DeleteDeckCardsResult,
  MigakuReconcileResult,
} from "@sentence-bank/types";

import { BASE, request } from "./request";

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

export const migakuImportsApi = {
  list: () => request<MigakuImport[]>("/migaku-imports"),
  get: (id: string) => request<MigakuImportDetail>(`/migaku-imports/${id}`),
  commit: (id: string, input: CommitMigakuImportInput) =>
    request<CommitMigakuImportResult>(`/migaku-imports/${id}/commit`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/migaku-imports/${id}`, {
    method: "DELETE",
  }),
  /** Destructive: delete every bank row imported under this deck, plus the import record. */
  deleteCards: (id: string) =>
    request<DeleteDeckCardsResult>(`/migaku-imports/${id}/cards`, {
      method: "DELETE",
    }),
  reconcile: (dryRun = false) =>
    request<MigakuReconcileResult>(`/migaku-imports/reconcile?dryRun=${dryRun}`, {
      method: "POST",
    }),
  /** Absolute path to a candidate's previewed audio/image. */
  mediaUrl: (id: string, candidateId: string, which: "audio" | "image") =>
    `${BASE}/migaku-imports/${id}/candidates/${candidateId}/${which}`,
  // Multipart upload of the raw `.apkg`; bypasses `request()` so the browser sets the boundary.
  upload: async (file: File): Promise<MigakuImportDetail> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/migaku-imports`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message ?? `Request failed with ${res.status}`);
    }
    return (await res.json()) as MigakuImportDetail;
  },
};

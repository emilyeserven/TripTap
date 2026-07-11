/**
 * Shared sentence-bank domain types.
 *
 * These are consumed by both the Fastify API (`@sentence-bank/middleware`) and the React client
 * (`@sentence-bank/client`) so the wire contract stays in one place.
 */

export * from "./lesson.js";

/** A reusable origin for sentences (a book, show, article, …) — the "source taxonomy". */
export interface Source {
  id: string;
  /** Display name, e.g. "よつばと！ vol. 1". */
  name: string;
  /** Free-text kind, e.g. "book", "show", "article". */
  type: string | null;
  author: string | null;
  url: string | null;
  notes: string | null;
  /** ISO-8601 timestamp of when the source was added. */
  createdAt: string;
}

/** Payload for creating a source. */
export interface CreateSourceInput {
  name: string;
  type?: string | null;
  author?: string | null;
  url?: string | null;
  notes?: string | null;
}

/** A single example sentence stored in the bank. */
export interface Sentence {
  id: string;
  /** The sentence in the target language, e.g. "毎朝コーヒーを飲みます。". */
  text: string;
  /** The meaning in the user's own language. */
  translation: string;
  /** Target language, e.g. "Japanese". */
  language: string;
  /** Legacy free-text origin, kept for rows predating the source taxonomy. */
  source: string | null;
  /** The taxonomy source this sentence belongs to, or null. */
  sourceId: string | null;
  /** Per-sentence location within the source, e.g. "42", "p. 12–13". */
  page: string | null;
  /** Optional free-form notes. */
  notes: string | null;
  /** Optional comma-separated tags. */
  tags: string | null;
  /** ISO-8601 timestamp of when the sentence was added. */
  createdAt: string;
}

/** Payload for creating a sentence. */
export interface CreateSentenceInput {
  text: string;
  translation: string;
  language: string;
  source?: string | null;
  sourceId?: string | null;
  page?: string | null;
  notes?: string | null;
  tags?: string | null;
}

/** Payload for partially updating a sentence. */
export type UpdateSentenceInput = Partial<CreateSentenceInput>;

/** Standard error shape returned by the API. */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

/** A single block of text recognized from an image by the OCR service. */
export interface OcrBlock {
  /** The recognized text for this block. */
  text: string;
  /** Bounding box as four [x, y] points (top-left, top-right, bottom-right, bottom-left). */
  bbox: [number, number][];
  /** Recognition confidence in [0, 1]. */
  confidence: number;
  /** Detected script for the block, e.g. "ja" or "en". */
  lang: string;
  /** Which engine produced the final text ("paddleocr" or "manga-ocr"). */
  engine: string;
}

/** Result returned by the OCR service for one image. */
export interface OcrResult {
  /** Per-block recognition results, ordered top-to-bottom. */
  blocks: OcrBlock[];
  /** All blocks joined into a single string for convenience. */
  fullText: string;
}

/** Workflow state of a capture: freshly scanned, or already mined into sentences. */
export type CaptureStatus = "new" | "parsed";

/** Fields shared by the capture list summary and the full detail. */
export interface CaptureSummary {
  id: string;
  /** Optional user-given label; falls back to a text preview in the UI. */
  title: string | null;
  /** The full extracted text (joined OCR output). */
  text: string;
  /** OCR engines that contributed to this capture, e.g. ["paddleocr", "manga-ocr"]. */
  engines: string[];
  /** The taxonomy source this capture came from, or null. */
  sourceId: string | null;
  /** Location within the source, e.g. "42", "p. 12–13". */
  page: string | null;
  notes: string | null;
  status: CaptureStatus;
  /** Whether an original image is stored (served from `/api/captures/:id/image`). */
  hasImage: boolean;
  imageWidth: number | null;
  imageHeight: number | null;
  /** ISO-8601 timestamp of when the capture was saved. */
  createdAt: string;
}

/** A saved OCR capture, including the per-block detail (detail view only). */
export interface Capture extends CaptureSummary {
  /** Per-block OCR detail, preserved for later parsing into sentences. */
  blocks: OcrBlock[];
  imageMime: string | null;
}

/**
 * JSON payload accompanying a capture upload. Sent as the `payload` field of a
 * `multipart/form-data` request whose `file` field carries the (optional) image.
 */
export interface CreateCaptureInput {
  title?: string | null;
  text: string;
  blocks: OcrBlock[];
  engines: string[];
  sourceId?: string | null;
  page?: string | null;
  notes?: string | null;
}

/** Masked state of a single stored secret. The secret itself is never sent to the client. */
export interface SecretState {
  /** Whether a value is currently stored. */
  configured: boolean;
  /** Last few characters of the stored value, for recognition (e.g. "1234"), or null when unset. */
  hint: string | null;
}

/**
 * Masked view of the cloud OCR credentials, as returned by `GET /api/settings/ocr`. Secrets are
 * stored server-side (DB, overriding env); only their presence and a short hint are exposed.
 */
export interface OcrSettings {
  ocrSpace: SecretState;
  googleVision: SecretState;
}

/**
 * Payload for `PATCH /api/settings/ocr`. Each field is tri-state: `undefined`/omitted leaves the
 * stored value unchanged, an empty string or `null` clears it, any other string replaces it.
 */
export interface UpdateOcrSettingsInput {
  ocrSpaceApiKey?: string | null;
  googleVisionApiKey?: string | null;
}

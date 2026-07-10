/**
 * Shared sentence-bank domain types.
 *
 * These are consumed by both the Fastify API (`@sentence-bank/middleware`) and the React client
 * (`@sentence-bank/client`) so the wire contract stays in one place.
 */

export * from "./lesson.js";

/** A single example sentence stored in the bank. */
export interface Sentence {
  id: string;
  /** The sentence in the target language, e.g. "毎朝コーヒーを飲みます。". */
  text: string;
  /** The meaning in the user's own language. */
  translation: string;
  /** Target language, e.g. "Japanese". */
  language: string;
  /** Optional origin (book, show, lesson, ...). */
  source: string | null;
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

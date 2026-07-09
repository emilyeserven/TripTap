/**
 * Shared sentence-bank domain types.
 *
 * These are consumed by both the Fastify API (`@sentence-bank/middleware`) and the React client
 * (`@sentence-bank/client`) so the wire contract stays in one place.
 */

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

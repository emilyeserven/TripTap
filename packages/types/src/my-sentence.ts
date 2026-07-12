/**
 * Shared "My Sentence" domain types.
 *
 * A my-sentence is a sentence the learner produced themselves (the "Output" step of the practice
 * worksheet — same pattern, their own life). Like a {@link PracticeSentence} it is *not* professionally
 * written: it starts flagged `needsCorrection`, with a nullable `correction` filled in later. It links
 * back to the practice sentence it was produced from. Consumed by both the Fastify API and the React
 * client.
 */

/** A learner-produced sentence, awaiting correction. */
export interface MySentence {
  id: string;
  /** The sentence the learner wrote. */
  text: string;
  /** An optional gloss/translation of what they meant; null if none. */
  translation: string | null;
  /** Target language, e.g. "Japanese". */
  language: string;
  /** The practice sentence this was produced from, or null. */
  practiceSentenceId: string | null;
  /** Whether it still needs correction (starts true — not professionally written). */
  needsCorrection: boolean;
  /** A corrected version of {@link text}, filled in later; null until corrected. */
  correction: string | null;
  /** ISO-8601 timestamp of when the sentence was added. */
  createdAt: string;
}

/** Payload for creating a my-sentence. Only `text` + `language` are required. */
export interface CreateMySentenceInput {
  text: string;
  language: string;
  translation?: string | null;
  practiceSentenceId?: string | null;
  /** Defaults to true server-side when omitted. */
  needsCorrection?: boolean;
  correction?: string | null;
}

/** Payload for partially updating a my-sentence. */
export type UpdateMySentenceInput = Partial<CreateMySentenceInput>;

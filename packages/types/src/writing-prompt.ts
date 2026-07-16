/**
 * Shared "Writing Prompts" domain types.
 *
 * A writing prompt is a reusable idea the learner saves to spark a free-write. Each has a Japanese
 * version (the prompt itself, shown by default and used as the display title) and an optional English
 * version revealed on request, plus a difficulty tag. When starting a new My Writing entry the learner
 * can pick a prompt; the chosen prompt is snapshotted onto the writing and shown above the writing area
 * as guidance (see `Writing.promptTitle` / `Writing.promptText`). Consumed by both the Fastify API and
 * the React client.
 */

/**
 * The difficulty tags a prompt can carry, in dropdown order. `JLPT N6` is not an official JLPT level
 * but is offered here by request (a pre-N5 stepping stone).
 */
export const WRITING_PROMPT_DIFFICULTIES = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "JLPT N6",
  "JLPT N5",
  "JLPT N4",
  "JLPT N3",
  "JLPT N2",
  "JLPT N1",
  "Other",
] as const;

/** One of the fixed difficulty tags. */
export type WritingPromptDifficulty = (typeof WRITING_PROMPT_DIFFICULTIES)[number];

/** A reusable writing prompt. */
export interface WritingPrompt {
  id: string;
  /** Short Japanese title/label for the prompt; falls back to `text` for display when null. */
  title: string | null;
  /** Short English title/label for the prompt; revealed alongside the English text. */
  titleEn: string | null;
  /** The Japanese version of the prompt — the (longer) prompt text. */
  text: string;
  /** The English version, revealed on request; null when not provided. */
  textEn: string | null;
  /** Difficulty tag; defaults to "Other". */
  difficulty: WritingPromptDifficulty;
  /** ISO-8601 timestamp of when the prompt was created. */
  createdAt: string;
  /** ISO-8601 timestamp of the last update. */
  updatedAt: string;
}

/** Payload for creating a writing prompt. `difficulty` defaults to "Other" when omitted. */
export interface CreateWritingPromptInput {
  title?: string | null;
  titleEn?: string | null;
  text: string;
  textEn?: string | null;
  difficulty?: WritingPromptDifficulty;
}

/** Payload for partially updating a writing prompt. */
export type UpdateWritingPromptInput = Partial<CreateWritingPromptInput>;

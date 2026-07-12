/**
 * Shared "Writing Prompts" domain types.
 *
 * A writing prompt is a reusable idea the learner saves to spark a free-write — a title and the
 * prompt body (e.g. "Describe your morning routine"). When starting a new My Writing entry the
 * learner can pick a prompt; the chosen prompt's title/text are snapshotted onto the writing and
 * shown above the writing area as guidance (see `Writing.promptTitle` / `Writing.promptText`).
 * Consumed by both the Fastify API and the React client.
 */

/** A reusable writing prompt. */
export interface WritingPrompt {
  id: string;
  /** Short label, shown when browsing/picking prompts. */
  title: string;
  /** The prompt body — what to write about. */
  text: string;
  /** ISO-8601 timestamp of when the prompt was created. */
  createdAt: string;
  /** ISO-8601 timestamp of the last update. */
  updatedAt: string;
}

/** Payload for creating a writing prompt. */
export interface CreateWritingPromptInput {
  title: string;
  text: string;
}

/** Payload for partially updating a writing prompt. */
export type UpdateWritingPromptInput = Partial<CreateWritingPromptInput>;

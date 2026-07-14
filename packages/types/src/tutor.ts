/**
 * Shared "Tutor" domain types.
 *
 * A tutor is the person who ran a {@link Lesson}. It's a lightweight reference entity — a name plus
 * optional notes — that lessons associate with and can be filtered by. Consumed by both the Fastify
 * API and the React client.
 */

/** A tutor a lesson can be associated with. */
export interface Tutor {
  id: string;
  /** Display name, e.g. "Tanaka-sensei". */
  name: string;
  /** Free-text notes about the tutor. */
  notes: string | null;
  /** ISO-8601 timestamp of when the tutor was added. */
  createdAt: string;
  /** ISO-8601 timestamp of the last update. */
  updatedAt: string;
}

/** Payload for creating a tutor. Only `name` is required. */
export interface CreateTutorInput {
  name: string;
  notes?: string | null;
}

/** Payload for partially updating a tutor. */
export type UpdateTutorInput = Partial<CreateTutorInput>;

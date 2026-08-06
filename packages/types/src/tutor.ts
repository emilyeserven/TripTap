/**
 * Shared "Tutor" domain types.
 *
 * A tutor is the person who ran a {@link Lesson}. It's a lightweight reference entity — a name plus
 * optional notes — that lessons associate with and can be filtered by. Consumed by both the Fastify
 * API and the React client.
 */

import { z } from "zod";

import { objectJsonSchema } from "./json-schema.js";

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

/**
 * The create payload, declared once.
 *
 * The route's JSON Schema and the TS input type are both derived from this. They used to be written
 * separately — an `interface` here and a `createTutorBody` literal in `routes/tutors.ts` — with
 * nothing tying them together, which is how a field can end up typed but not accepted (or accepted
 * but silently stripped, since Ajv's `removeAdditional` drops unknown keys rather than rejecting
 * them). That has already happened once in this codebase, to the XP rate settings.
 */
export const createTutorSchema = z.object({
  name: z.string().min(1),
  notes: z.string().nullable().optional(),
});

/** JSON Schema (draft-07) for the create payload, used verbatim as the route body. */
export const createTutorJsonSchema = objectJsonSchema(createTutorSchema);

/** Payload for creating a tutor. Only `name` is required. */
export type CreateTutorInput = z.infer<typeof createTutorSchema>;

/** Payload for partially updating a tutor. */
export type UpdateTutorInput = Partial<CreateTutorInput>;

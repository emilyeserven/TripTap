/**
 * Shared "Shadowing List" domain types.
 *
 * A shadowing list is a named collection of sentences a learner has flagged as good shadowing
 * practice — drawn from both the sentence bank (`sentenceIds`) and their own produced sentences
 * (`mySentenceIds`). Membership is many-to-many: a sentence can belong to any number of lists, stored
 * inline as id arrays. Consumed by both the Fastify API and the React client.
 */

import { z } from "zod";

import { objectJsonSchema } from "./json-schema.js";

/** A named list of shadowing-candidate sentences. */
export interface ShadowingList {
  id: string;
  /** Display name, e.g. "Morning drill". */
  name: string;
  /** Free-text notes about the list. */
  notes: string | null;
  /** Ids of bank `Sentence`s in this list, in insertion order. */
  sentenceIds: string[];
  /** Ids of learner-produced `MySentence`s in this list, in insertion order. */
  mySentenceIds: string[];
  /** ISO-8601 timestamp of when the list was created. */
  createdAt: string;
  /** ISO-8601 timestamp of the last update. */
  updatedAt: string;
}

/** Payload for creating a shadowing list. Only `name` is required. */
export const createShadowingListSchema = z.object({
  name: z.string().min(1),
  notes: z.string().nullable().optional(),
  sentenceIds: z.array(z.guid()).optional(),
  mySentenceIds: z.array(z.guid()).optional(),
});

/** JSON Schema (draft-07) for the create payload, used verbatim as the route body. */
export const createShadowingListJsonSchema = objectJsonSchema(createShadowingListSchema);

export type CreateShadowingListInput = z.infer<typeof createShadowingListSchema>;

/** Payload for partially updating a shadowing list (rename, re-note, or set membership). */
export type UpdateShadowingListInput = Partial<CreateShadowingListInput>;

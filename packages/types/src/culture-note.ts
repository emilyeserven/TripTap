/**
 * Shared "Culture Note" domain types.
 *
 * A culture note is a user-authored snippet of cultural context — possibly just one sentence —
 * with an optional English body and an optional Japanese body (at least one of the two, enforced
 * by the service). Notes are filed under {@link CultureTopic}s, the app's own flat taxonomy, by id
 * (no FK — the drill-reasons precedent; stale ids degrade gracefully at render time). Consumed by
 * both the Fastify API and the React client.
 */

import type { IconKey } from "./ai-lesson.js";

import { z } from "zod";

import { iconKeySchema } from "./ai-lesson.js";
import { objectJsonSchema } from "./json-schema.js";

/** A topic in the flat, app-internal culture taxonomy (Food, Etiquette, …). */
export interface CultureTopic {
  id: string;
  /** Display name, e.g. "Food". */
  name: string;
  /** ISO-8601 timestamp of when the topic was added. */
  createdAt: string;
  /** ISO-8601 timestamp of the last update. */
  updatedAt: string;
}

/** The create payload for a topic, declared once — see {@link createCultureNoteSchema}. */
export const createCultureTopicSchema = z.object({
  name: z.string().min(1),
});

/** JSON Schema (draft-07) for the topic create payload, used verbatim as the route body. */
export const createCultureTopicJsonSchema = objectJsonSchema(createCultureTopicSchema);

/** Payload for creating a culture topic. */
export type CreateCultureTopicInput = z.infer<typeof createCultureTopicSchema>;

/** Payload for partially updating a culture topic. */
export type UpdateCultureTopicInput = Partial<CreateCultureTopicInput>;

/** A user-authored culture note. */
export interface CultureNote {
  id: string;
  /** Optional Japanese heading. */
  titleJp: string | null;
  /** Optional English heading. */
  titleEn: string | null;
  /** English body. At least one of `bodyEn`/`bodyJa` is non-null (service-enforced). */
  bodyEn: string | null;
  /** Japanese body. At least one of `bodyEn`/`bodyJa` is non-null (service-enforced). */
  bodyJa: string | null;
  /** Optional icon key (see ICON_KEYS), shared with AI-lesson culture cards. */
  icon: IconKey | null;
  /** Vocab terms to surface as hover chips, like AI-lesson culture cards. May be empty. */
  terms: string[];
  /** Ids into the culture-topics taxonomy. May be empty; stale ids degrade gracefully. */
  topicIds: string[];
  /** ISO-8601 timestamp of when the note was added. */
  createdAt: string;
  /** ISO-8601 timestamp of the last update. */
  updatedAt: string;
}

/**
 * The create payload, declared once.
 *
 * The route's JSON Schema and the TS input type are both derived from this so they can't drift
 * (Ajv's `removeAdditional` silently strips unknown keys rather than rejecting them). The
 * at-least-one-body rule is NOT expressed here: nullable fields make an `anyOf`-of-`required`
 * unsound (`{ bodyEn: null }` would satisfy it), and a JSON Schema on the create route couldn't
 * guard a PATCH clearing one body anyway — the service enforces it on both paths.
 */
export const createCultureNoteSchema = z.object({
  titleJp: z.string().min(1).nullable().optional(),
  titleEn: z.string().min(1).nullable().optional(),
  bodyEn: z.string().min(1).nullable().optional(),
  bodyJa: z.string().min(1).nullable().optional(),
  icon: iconKeySchema.nullable().optional(),
  terms: z.array(z.string().min(1)).optional(),
  topicIds: z.array(z.guid()).optional(),
});

/** JSON Schema (draft-07) for the note create payload, used verbatim as the route body. */
export const createCultureNoteJsonSchema = objectJsonSchema(createCultureNoteSchema);

/** Payload for creating a culture note. Everything is optional except one body (service-enforced). */
export type CreateCultureNoteInput = z.infer<typeof createCultureNoteSchema>;

/** Payload for partially updating a culture note. */
export type UpdateCultureNoteInput = Partial<CreateCultureNoteInput>;

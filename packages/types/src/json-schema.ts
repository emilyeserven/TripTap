import { z } from "zod";

/**
 * Turning a Zod payload schema into the JSON Schema a Fastify route validates against.
 *
 * Declaring a payload once and deriving *both* the TS input type (`z.infer`) and the route's
 * validator from it is what stops the two drifting. They used to be written separately — an
 * `interface` in this package and a `create<X>Body` literal in `routes/<x>.ts` — with nothing
 * tying them together, so a field could be typed but not accepted, or accepted but silently
 * dropped (Ajv's `removeAdditional` strips unknown keys rather than rejecting them). That has
 * already happened here: the XP rate settings drifted and became un-saveable.
 *
 * The conversion lives in this package, not the middleware, because this is where `zod` is a
 * dependency and where `ai-lesson.ts` / `practice-sentence.ts` already do it for the pasted-AI-JSON
 * bodies. One spelling of the options means every route's schema is generated the same way.
 */

/**
 * **Use `z.guid()`, not `z.uuid()`, for id fields.**
 *
 * The hand-written schemas say `format: "uuid"`, which Fastify's bundled `ajv-formats` enforces as
 * "8-4-4-4-12 hex". `z.uuid()` additionally pins the RFC 4122 version and variant nibbles, so it
 * rejects ids the API accepts today — a real narrowing, caught here by an existing test whose
 * fixture id (`1111…`) has variant nibble `1`. `z.guid()` emits the same `format: "uuid"` with a
 * matching lax pattern, so the contract is unchanged.
 */

/** The parts of a generated object schema the route layer reads. */
export interface GeneratedObjectSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: unknown;
}

/**
 * The draft-07 JSON Schema for an object payload.
 *
 * The emitted `$schema` key is left in place: Ajv accepts it, `@fastify/swagger` drops it from the
 * published document, and the existing `practiceSentenceImportJsonSchema` has shipped that way.
 */
export function objectJsonSchema(schema: z.ZodType): GeneratedObjectSchema {
  return z.toJSONSchema(schema, {
    target: "draft-7",
  }) as unknown as GeneratedObjectSchema;
}

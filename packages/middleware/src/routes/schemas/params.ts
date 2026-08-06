/**
 * Shared JSON-Schema fragments for path parameters and derived bodies.
 *
 * The `{ id: uuid }` params object was restated verbatim in 27 routes, and 18 routes built their
 * PATCH body by spreading the POST body's properties into the same three-line wrapper. Both are
 * mechanical enough that a copy is never *wrong* — it's just another place to miss when the shape
 * changes. Import from here instead. Companion to {@link ./terms.ts}.
 */

/** The `:id` path param every entity route validates as a UUID. */
export const idParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

/**
 * The PATCH body for an entity whose POST body is `createBody`: the same properties, none of them
 * required, unknown keys stripped.
 *
 * Generic over the create body so the emitted object keeps its literal type — the routes pass these
 * straight to Fastify, and a widened `Record<string, unknown>` would lose the schema's shape.
 */
export function updateBodyOf<const T extends { properties: Record<string, unknown> }>(createBody: T) {
  return {
    type: "object",
    additionalProperties: false,
    properties: createBody.properties,
  } as const;
}

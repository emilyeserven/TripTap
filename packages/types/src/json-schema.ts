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

/**
 * A `format: "date"` string, exactly as the hand-written schemas spell it.
 *
 * Not `z.iso.date()`: that emits a large calendar-aware `pattern` on top of the format, which is a
 * different (stricter) contract than what Ajv enforces today and would bury the real changes in the
 * snapshot diff.
 */
export function isoDateString() {
  return z.string().meta({
    format: "date",
  });
}

/**
 * A non-negative integer, exactly as the hand-written schemas spell it.
 *
 * `z.int()` emits `maximum: 9007199254740991` — a ceiling the current schemas don't have. Values
 * above it are already meaningless in JS, but adding a bound the API didn't have is still a change,
 * and one line of noise per integer field. `meta({ maximum: undefined })` drops it from the emitted
 * schema; the Zod type stays a true integer.
 */
export function nonNegativeInt() {
  return intAtLeast(0);
}

/** An integer with a floor other than zero (a replay count, a repetition), and no ceiling. */
export function intAtLeast(min: number) {
  return z.int().min(min).meta({
    maximum: undefined,
  });
}

/**
 * A plain integer with no bounds, exactly as the hand-written schemas spell it.
 *
 * `z.int()` emits *both* a `minimum` and a `maximum` at the safe-integer limits. {@link
 * nonNegativeInt} only has to drop the ceiling because `.min(0)` replaces the floor; an unbounded
 * integer has to drop both.
 */
export function anyInt() {
  return z.int().meta({
    minimum: undefined,
    maximum: undefined,
  });
}

/**
 * The draft-07 JSON Schema for a *fragment* — a field's shape rather than a whole body.
 *
 * Converting a fragment directly would stamp a top-level `$schema` onto it, which is meaningless
 * nested inside a body's `properties`. Wrapping it in a throwaway object and lifting the property
 * back out yields the clean sub-schema the route fragments need.
 */
export function fieldJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const wrapped = z.toJSONSchema(z.object({
    field: schema,
  }), {
    target: "draft-7",
  }) as unknown as { properties: { field: Record<string, unknown> } };
  return collapseNullableUnions(wrapped.properties.field) as Record<string, unknown>;
}

/**
 * Collapse Zod's `anyOf` unions back to the `type: [X, Y]` form the hand-written schemas use.
 *
 * **This is not cosmetic.** Fastify configures Ajv with `coerceTypes: "array"`, and the two forms
 * behave differently under it: `{ anyOf: [{type:"string"}, {type:"null"}] }` coerces a
 * single-element array to its element and accepts it, while `{ type: ["string","null"] }` rejects
 * it. Emitting `anyOf` therefore *widens* every union field — the API starts accepting
 * `["2026-07-15"]` where it used to reject it. An existing answer-sheets test caught exactly that.
 *
 * Two shapes collapse. A **nullable** union (`X | null`) keeps the non-null branch's other
 * keywords; its enum case needs care, since `type: ["string","null"]` with `enum: ["a","b"]` would
 * reject `null` — the hand-written schemas list `null` in the enum too, and this reproduces that.
 * A union of **bare types** (`boolean | string`, a practice-sentence pass value) becomes the plain
 * type array. Anything else is left alone: a union whose branches carry their own constraints is
 * not expressible as a type array, so rewriting it would change what it accepts.
 */
function collapseNullableUnions(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(collapseNullableUnions);
  if (node === null || typeof node !== "object") return node;

  const obj = node as Record<string, unknown>;
  const branches = obj.anyOf;
  if (Array.isArray(branches) && Object.keys(obj).length === 1) {
    const isBareType = (b: unknown): b is { type: string } =>
      !!b && typeof b === "object" && typeof (b as { type?: unknown }).type === "string"
      && Object.keys(b).length === 1;

    if (branches.length === 2) {
      const [first, second] = branches as Record<string, unknown>[];
      const isNull = (b: unknown) => isBareType(b) && b.type === "null";
      const value = isNull(second) ? first : isNull(first) ? second : null;
      if (value && typeof value.type === "string") {
        const {
          type, enum: values, ...rest
        } = value;
        return {
          type: [type, "null"],
          // A bare `type` union still has to admit null through the enum, as the originals did.
          ...(Array.isArray(values)
            ? {
              enum: [...values, null],
            }
            : {}),
          ...collapseNullableUnions(rest) as Record<string, unknown>,
        };
      }
    }

    if (branches.length > 1 && branches.every(isBareType)) {
      return {
        type: (branches as { type: string }[]).map(b => b.type),
      };
    }
  }

  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, collapseNullableUnions(v)]));
}

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
  return collapseNullableUnions(z.toJSONSchema(schema, {
    target: "draft-7",
  })) as GeneratedObjectSchema;
}

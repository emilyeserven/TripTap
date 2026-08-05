/**
 * Shared JSON-Schema fragments for the borrowed-taxonomy term refs (`SentenceTermRef`).
 *
 * The same validation shape was previously restated in every route that accepts tags — eleven
 * copies, which is eleven places to miss when a channel is added. Import from here instead.
 */

/** One term ref: the denormalized (id + name + provenance + channel) tag stored on an entity. */
const termRefSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "name", "kind", "sourceId", "sourceLabel"],
  properties: {
    id: {
      type: "string",
    },
    name: {
      type: "string",
    },
    kind: {
      type: "string",
      enum: ["tag", "taxonomy"],
    },
    sourceId: {
      type: "string",
    },
    sourceLabel: {
      type: "string",
    },
    category: {
      type: "string",
      enum: ["vocabulary", "grammar", "general", "resource"],
    },
  },
} as const;

/** A nullable list of term refs — the `terms` / `grammarTerms` column shape. */
export const termsSchema = {
  type: ["array", "null"],
  items: termRefSchema,
} as const;

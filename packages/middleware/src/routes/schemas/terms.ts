import { fieldJsonSchema, termsListSchema } from "@sentence-bank/types";

/**
 * Shared JSON-Schema fragment for the borrowed-taxonomy term refs (`SentenceTermRef`).
 *
 * The same validation shape was previously restated in every route that accepts tags — eleven
 * copies, which is eleven places to miss when a channel is added. It was then written once here,
 * by hand, which left one copy that could still drift from the TypeScript type: that is exactly
 * how `category` came to be required on the type but optional on the wire (#267). It now derives
 * from the Zod declaration in `types/src/terms.ts`, so the wire type, the validator and this
 * fragment cannot disagree.
 */

/** A nullable list of term refs — the `terms` / `grammarTerms` column shape. */
export const termsSchema = fieldJsonSchema(termsListSchema);

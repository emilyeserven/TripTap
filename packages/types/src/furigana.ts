/**
 * The furigana token's *validator*, kept out of the barrel.
 *
 * {@link FuriToken} itself lives in `index.ts` next to `Sentence`, but a Zod schema is a runtime
 * value, and `index.ts` re-exports every feature module before it declares anything of its own — so
 * a feature module importing the schema back out of the barrel hits the temporal dead zone and
 * throws at import time. (Type-only imports from the barrel are fine; they're erased.) Declaring the
 * schema here gives `dialogue.ts` and the sentence routes a module they can import directly.
 */

import { z } from "zod";

/**
 * One furigana token, as a route body accepts it.
 *
 * Two spellings are in circulation and the difference is deliberate: the sentence routes require
 * both `t` and `r` (a generated reading always has both, `r` merely nullable), while a dialogue line
 * may carry a token with no `r` at all — {@link furiTokenPartialSchema} is that looser one.
 * Unifying them would change one route's contract, so they stay two, declared side by side rather
 * than inlined a route apart.
 */
export const furiTokenSchema = z.object({
  t: z.string(),
  r: z.string().nullable(),
});

/** {@link furiTokenSchema} with `r` optional — the dialogue-line spelling. */
export const furiTokenPartialSchema = furiTokenSchema.extend({
  r: z.string().nullable().optional(),
});

/**
 * Term-ref helpers. The implementation lives in `@sentence-bank/types` so the API and the client
 * read term refs the same way; this module re-exports it under the path the client already imports.
 */

export {
  groupTermsByCategory,
  replaceCategory,
  TERM_CATEGORIES,
  termCategory,
  termsChanged,
} from "@sentence-bank/types";

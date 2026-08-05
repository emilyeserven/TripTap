/**
 * Cross-feature term usage — the answer to "what have I done with this grammar point / tag?".
 *
 * Term refs are stored as denormalized JSONB on ten columns across nine tables, so before this
 * existed every such question was answered client-side by fetching each feature's whole list and
 * filtering in the browser. This contract lets the API answer it in one request, which is also what
 * makes it practical to surface the tagged entities that no view previously joined (practice
 * sentences, writings, reading/listening/shadowing sessions, question sheets).
 */

/** Which feature a usage came from. */
export type TermUsageKind
  = | "sentence"
    | "my_sentence"
    | "practice_sentence"
    | "writing"
    | "question_sheet"
    | "listening_session"
    | "shadowing_session"
    | "ai_lesson_grammar"
    | "ai_lesson_sentence";

/** One entity tagged with the requested term. */
export interface TermUsage {
  kind: TermUsageKind;
  id: string;
  /** Primary display line — the sentence text, sheet title, session title, … */
  title: string;
  /** Secondary display line — a translation, gloss or date; null when the entity has none. */
  subtitle: string | null;
  /**
   * True when the entity records the term as used *incorrectly* (My Sentences'
   * `incorrectGrammarTerms`) rather than simply used.
   */
  incorrect: boolean;
}

/** Everything tagged with one term, newest-first within each kind. */
export interface TermUsageSummary {
  termId: string;
  /** Total across all kinds. */
  total: number;
  usages: TermUsage[];
}

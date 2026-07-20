/**
 * Shared Learner Profile domain types.
 *
 * The profile is a small, single-user document: up to three goals the learner is currently working
 * toward. Each goal can be pointed at any mix of Learning Areas (the fixed skill enum), Grammar-channel
 * bookmark terms, and Resource-channel bookmark terms ("Textbooks & Worksheets"); the Start Something
 * page uses those references to pick and boost suggestion candidates. Stored as one JSON settings value
 * (`profile.goals`), not its own table. Consumed by both the Fastify API and the React client.
 */

import type { SentenceTermRef } from "./index.js";
import type { LearningArea } from "./question-sheet.js";

/** The most goals a profile can hold — small on purpose, to force focus. */
export const MAX_LEARNER_GOALS = 3;

/** One goal the learner set for themselves. */
export interface LearnerGoal {
  /** Stable client-generated id (via `crypto.randomUUID()`). */
  id: string;
  title: string;
  /** Optional free-text detail; null if none. */
  notes: string | null;
  /** Learning areas this goal targets. */
  learningAreas: LearningArea[];
  /** Grammar-channel bookmark terms this goal targets. */
  grammarTerms: SentenceTermRef[];
  /** Resource-channel ("Textbooks & Worksheets") bookmark terms this goal targets. */
  resourceTerms: SentenceTermRef[];
}

/** The learner profile document. */
export interface LearnerProfile {
  /** Up to {@link MAX_LEARNER_GOALS} goals. */
  goals: LearnerGoal[];
}

/** Payload for updating the profile. `goals` is tri-state: omit = leave, null/[] = clear. */
export interface UpdateLearnerProfileInput {
  goals?: LearnerGoal[] | null;
}

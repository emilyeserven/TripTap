import type { SentenceTermRef } from "./index.js";

/**
 * Where a newly-captured sentence lands.
 *
 * The app grew twelve ways to add a sentence, and each one was wired to exactly one of the three
 * tables — so finding a good example in Renshuu meant it could only ever go to the bank, and a line
 * pulled off a capture could only ever go to practice. The destination is a *property of the moment*
 * ("I want to study this" vs "I wrote this and it needs checking"), not of the tool that found the
 * sentence, so it belongs in the shared vocabulary rather than baked into each entry point.
 */
export type SentenceDestination = "bank" | "mine" | "practice";

/** Every destination, in the order they should be offered. */
export const SENTENCE_DESTINATIONS: readonly SentenceDestination[] = [
  "bank",
  "mine",
  "practice",
] as const;

/** Human copy for a destination — the picker's label and the one-line explanation under it. */
export const SENTENCE_DESTINATION_INFO: Record<SentenceDestination, {
  label: string;
  description: string;
}> = {
  bank: {
    label: "Sentence bank",
    description: "Reference examples to study and export.",
  },
  mine: {
    label: "My Sentences",
    description: "Sentences you wrote, queued for correction.",
  },
  practice: {
    label: "Practice",
    description: "Study cards with passes and a breakdown.",
  },
};

/**
 * The fields every destination understands, plus the optional ones only some can hold.
 *
 * A draft is what an entry point produces; the destination resolver turns it into that table's
 * `Create…Input`. **Fields a destination has no column for are dropped** — the alternative is
 * inventing columns to make the three tables identical, which is the merge this roadmap explicitly
 * decided against. What drops where:
 *
 * | Field | bank | mine | practice |
 * |---|---|---|---|
 * | `text`, `language`, `translation`, `terms` | ✓ | ✓ | ✓ |
 * | `tags` | ✓ | — | — |
 * | `provenanceNote` | ✓ (`notes`) | — | — |
 * | `sourceId`, `page`, `captureId` | ✓ | — | ✓ |
 * | `sentenceId` | — | — | ✓ |
 */
export interface SentenceDraft {
  text: string;
  language: string;
  translation?: string | null;
  terms?: SentenceTermRef[] | null;
  /** Free-text tags. Bank only. */
  tags?: string | null;
  /** Where this came from, in prose (e.g. "From Renshuu #1234"). Bank only, as `notes`. */
  provenanceNote?: string | null;
  sourceId?: string | null;
  page?: string | null;
  captureId?: string | null;
  /** The bank sentence this was mined from. Practice only. */
  sentenceId?: string | null;
}

/**
 * True when sending `draft` to `destination` would silently discard something the draft carries.
 *
 * Entry points use this to warn rather than to block — dropping a provenance note to get a sentence
 * into the right table is usually the trade the learner wants, but they should know it happened.
 */
export function draftLosesFields(
  draft: SentenceDraft,
  destination: SentenceDestination,
): string[] {
  const lost: string[] = [];
  if (destination !== "bank") {
    if (draft.tags) lost.push("tags");
    if (draft.provenanceNote) lost.push("source note");
  }
  if (destination === "mine") {
    if (draft.sourceId) lost.push("source");
    if (draft.page) lost.push("page");
    if (draft.captureId) lost.push("capture link");
  }
  if (destination !== "practice" && draft.sentenceId) lost.push("bank-sentence link");
  return lost;
}

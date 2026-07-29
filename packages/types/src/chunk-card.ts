/**
 * Shared "Chunk Card" domain types.
 *
 * A chunk card is the artifact a `collocation` correction produces same-day: a single unnatural-but-
 * grammatical phrase to memorize as one chunk. Two formats — a situation→production prompt (an English
 * scene, produce the Japanese) or a cloze (blank the choice point). The learner's original wrong form
 * is stored in `wrongForm` for the log only and is **never** rendered on a card face (spec §6 inv.3);
 * review/scheduling happens in Anki after export. Consumed by both the Fastify API and the React client.
 */

/** Situation→production (harder, matches that production is what failed) or a cloze. */
export type ChunkCardFormat = "situation_production" | "cloze";

/** The chunk-card formats, for iterating in schemas/pickers. */
export const CHUNK_CARD_FORMATS: readonly ChunkCardFormat[] = ["situation_production", "cloze"];

/** A single-chunk memorization card mined from a collocation correction. */
export interface ChunkCard {
  id: string;
  /** The correction this was mined from, or null if the source was deleted. */
  correctionId: string | null;
  /** The capture batch it belongs to; bounds card production per batch (spec §6 inv.2). */
  batchId: string;
  /** The chunk itself, e.g. お風呂に入る. */
  chunk: string;
  gloss: string;
  format: ChunkCardFormat;
  /** The card front — an English situation, or a sentence with a blank. */
  prompt: string;
  /** The card back — the produced chunk / filled answer. */
  answer: string;
  /** The learner's incorrect form. LOG/ANALYTICS ONLY — never rendered on a card face (spec §6 inv.3). */
  wrongForm: string | null;
  createdAt: string;
  /** ISO-8601 timestamp of the last Anki export, or null if never exported. */
  exportedAt: string | null;
}

/** Payload for creating a chunk card. `batchId`, `chunk`, `gloss`, `format`, `prompt`, `answer` required. */
export interface CreateChunkCardInput {
  correctionId?: string | null;
  batchId: string;
  chunk: string;
  gloss: string;
  format: ChunkCardFormat;
  prompt: string;
  answer: string;
  wrongForm?: string | null;
}

/** Payload for partially updating a chunk card. The batch (its cap grouping) is immutable. */
export type UpdateChunkCardInput = Partial<Omit<CreateChunkCardInput, "batchId">> & {
  exportedAt?: string | null;
};

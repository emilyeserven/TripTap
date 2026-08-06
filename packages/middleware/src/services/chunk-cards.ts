import { desc, eq } from "drizzle-orm";
import type {
  ChunkCard,
  CreateChunkCardInput,
  UpdateChunkCardInput,
} from "@sentence-bank/types";
import { BATCH_CARD_CAP } from "@sentence-bank/types";
import { db } from "@/db";
import { chunkCards, type ChunkCardRow } from "@/db/schema";
import { linkProducedCards } from "@/services/corrections";
import { toIsoOrNull } from "@/services/rows";

/** Producing a 4th card in one batch is a hard block, not a warning (spec §6 inv.2). */
export class VolumeCapError extends Error {}

function toChunkCard(row: ChunkCardRow): ChunkCard {
  return {
    id: row.id,
    correctionId: row.correctionId,
    batchId: row.batchId,
    chunk: row.chunk,
    gloss: row.gloss,
    format: row.format,
    prompt: row.prompt,
    answer: row.answer,
    wrongForm: row.wrongForm,
    createdAt: toIsoOrNull(row.createdAt)!,
    exportedAt: toIsoOrNull(row.exportedAt),
  };
}

export async function listChunkCards(opts: { batchId?: string } = {}): Promise<ChunkCard[]> {
  const rows = await db
    .select()
    .from(chunkCards)
    .where(opts.batchId ? eq(chunkCards.batchId, opts.batchId) : undefined)
    .orderBy(desc(chunkCards.createdAt));
  return rows.map(toChunkCard);
}

export async function getChunkCard(id: string): Promise<ChunkCard | null> {
  const [row] = await db.select().from(chunkCards).where(eq(chunkCards.id, id));
  return row ? toChunkCard(row) : null;
}

/** How many chunk cards already exist in a batch — the count the volume cap checks (spec §6 inv.2). */
export async function batchCardCount(batchId: string): Promise<number> {
  const rows = await db
    .select({
      id: chunkCards.id,
    })
    .from(chunkCards)
    .where(eq(chunkCards.batchId, batchId));
  return rows.length;
}

/**
 * Create a chunk card, hard-blocking a 4th card in the same batch (spec §6 inv.2). Records the card on
 * its source correction's `producedCardIds` when one is given.
 */
export async function createChunkCard(input: CreateChunkCardInput): Promise<ChunkCard> {
  const existing = await batchCardCount(input.batchId);
  if (existing >= BATCH_CARD_CAP) {
    throw new VolumeCapError(
      `This batch already has ${BATCH_CARD_CAP} cards — the cap that keeps triage a deletion tool. `
      + "Retire one before adding another, or leave the rest as log entries.",
    );
  }

  const [row] = await db
    .insert(chunkCards)
    .values({
      correctionId: input.correctionId ?? null,
      batchId: input.batchId,
      chunk: input.chunk,
      gloss: input.gloss,
      format: input.format,
      prompt: input.prompt,
      answer: input.answer,
      wrongForm: input.wrongForm ?? null,
    })
    .returning();
  if (input.correctionId) await linkProducedCards([input.correctionId], row.id);
  return toChunkCard(row);
}

export async function updateChunkCard(
  id: string,
  input: UpdateChunkCardInput,
): Promise<ChunkCard | null> {
  const set: Partial<ChunkCardRow> = {};
  if (input.correctionId !== undefined) set.correctionId = input.correctionId ?? null;
  if (input.chunk !== undefined) set.chunk = input.chunk;
  if (input.gloss !== undefined) set.gloss = input.gloss;
  if (input.format !== undefined) set.format = input.format;
  if (input.prompt !== undefined) set.prompt = input.prompt;
  if (input.answer !== undefined) set.answer = input.answer;
  if (input.wrongForm !== undefined) set.wrongForm = input.wrongForm ?? null;
  if (input.exportedAt !== undefined) set.exportedAt = input.exportedAt ? new Date(input.exportedAt) : null;

  const [row] = await db.update(chunkCards).set(set).where(eq(chunkCards.id, id)).returning();
  return row ? toChunkCard(row) : null;
}

export async function deleteChunkCard(id: string): Promise<boolean> {
  const rows = await db
    .delete(chunkCards)
    .where(eq(chunkCards.id, id))
    .returning({
      id: chunkCards.id,
    });
  return rows.length > 0;
}

/**
 * Migaku `.apkg` import orchestration: upload & parse → review → commit/discard.
 *
 * The raw package is held in object storage (not Postgres) between upload and commit so per-card media
 * can be extracted lazily; the staging row only carries the parsed candidates.
 */

import { desc, eq } from "drizzle-orm";
import type {
  CommitMigakuImportInput,
  CommitMigakuImportResult,
  DeleteDeckCardsResult,
  MigakuCandidate,
  MigakuImport,
  MigakuImportDetail,
  MigakuImportFormat,
  MigakuNoteGroup,
} from "@sentence-bank/types";
import { db } from "@/db";
import { migakuImports, type MigakuImportRow } from "@/db/schema";
import { newId } from "@/lib/id";
import { deleteMedia, getMedia, MEDIA_PREFIX, putMedia, type StoredMedia } from "@/services/media";
import { extractApkgMedia } from "@/services/migaku/apkg";
import { parseApkg } from "@/services/migaku/apkg";
import { commitCandidates } from "@/services/migaku/commit";
import { deckNameFromFilename, deleteDeckCards } from "@/services/migaku/deck";
import { candidateExists, getExistingKeys } from "@/services/migaku/dedup";
import { MigakuImportNotFoundError } from "@/services/migaku/errors";
import { toPublicCandidate, type StoredMigakuCandidate } from "@/services/migaku/types";

export { MigakuParseError, MigakuImportNotFoundError } from "@/services/migaku/errors";
export { reconcileMedia } from "@/services/migaku/reconcile";

/** The stored candidates carry internal media filenames; cast back to that shape on read. */
function storedCandidates(row: MigakuImportRow): StoredMigakuCandidate[] {
  return row.candidates as unknown as StoredMigakuCandidate[];
}

/** Map stored candidates to their public shape, flagging any that already exist in the bank. */
async function toPublicCandidates(stored: StoredMigakuCandidate[]): Promise<MigakuCandidate[]> {
  const existing = await getExistingKeys();
  return stored.map(c => toPublicCandidate(c, candidateExists(c.kind, c.text, existing)));
}

/** A grouped import (Migaku model) is signalled by candidates carrying a shared `groupId`. */
function formatOf(stored: StoredMigakuCandidate[]): MigakuImportFormat {
  return stored.some(c => c.groupId) ? "migaku" : "generic";
}

/** Reconstruct the vocab↔sentence note groups from the flat stored candidates (Migaku path only). */
function buildNoteGroups(stored: StoredMigakuCandidate[]): MigakuNoteGroup[] {
  const groups = new Map<string, MigakuNoteGroup>();
  const order: string[] = [];
  for (const c of stored) {
    if (!c.groupId) continue;
    let group = groups.get(c.groupId);
    if (!group) {
      group = {
        id: c.groupId,
        vocabId: null,
        sentenceIds: [],
        hasImage: false,
      };
      groups.set(c.groupId, group);
      order.push(c.groupId);
    }
    if (c.kind === "vocab") group.vocabId = c.id;
    else group.sentenceIds.push(c.id);
    if (c.imageFile) group.hasImage = true;
  }
  return order.map(id => groups.get(id)!);
}

function toImport(row: MigakuImportRow): MigakuImport {
  return {
    id: row.id,
    filename: row.filename,
    format: formatOf(storedCandidates(row)),
    deckName: row.deckName ?? deckNameFromFilename(row.filename),
    status: row.status as MigakuImport["status"],
    candidateCount: row.candidates.length,
    sentencesCreated: row.sentencesCreated ?? null,
    vocabCreated: row.vocabCreated ?? null,
    skipped: row.skipped ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

/** Parse an uploaded `.apkg`, stash it in object storage, and stage its candidates for review. */
export async function createImport(buffer: Buffer, filename: string): Promise<MigakuImportDetail> {
  const {
    deckName, candidates,
  } = await parseApkg(buffer);
  const id = newId();
  const apkgKey = `${MEDIA_PREFIX}imports/${id}.apkg`;
  await putMedia(apkgKey, buffer, "application/zip");

  const [row] = await db.insert(migakuImports).values({
    id,
    filename,
    deckName: deckName ?? deckNameFromFilename(filename),
    status: "parsed",
    apkgKey,
    // Stored shape includes internal media filenames; the column is typed to the public candidate.
    candidates: candidates as unknown as MigakuCandidate[],
  }).returning();

  return {
    ...toImport(row),
    candidates: await toPublicCandidates(candidates),
    noteGroups: buildNoteGroups(candidates),
  };
}

export async function listImports(): Promise<MigakuImport[]> {
  const rows = await db.select().from(migakuImports).orderBy(desc(migakuImports.createdAt));
  return rows.map(toImport);
}

export async function getImport(id: string): Promise<MigakuImportDetail | null> {
  const [row] = await db.select().from(migakuImports).where(eq(migakuImports.id, id));
  if (!row) return null;
  return {
    ...toImport(row),
    candidates: await toPublicCandidates(storedCandidates(row)),
    noteGroups: buildNoteGroups(storedCandidates(row)),
  };
}

/** Fetch one candidate's audio/image bytes from the stored package, or null when absent. */
export async function getCandidateMedia(
  importId: string,
  candidateId: string,
  which: "audio" | "image",
): Promise<StoredMedia | null> {
  const [row] = await db.select().from(migakuImports).where(eq(migakuImports.id, importId));
  if (!row || !row.apkgKey) return null;
  const candidate = storedCandidates(row).find(c => c.id === candidateId);
  const filename = which === "audio" ? candidate?.audioFile : candidate?.imageFile;
  if (!candidate || !filename) return null;
  const apkg = await getMedia(row.apkgKey);
  if (!apkg) return null;
  const media = extractApkgMedia(apkg.body, filename);
  return media
    ? {
      body: media.body,
      contentType: media.mime,
    }
    : null;
}

/**
 * Commit a reviewed import: create the kept rows (with media), then clean up the staged package and
 * mark the import committed. Throws {@link MigakuImportNotFoundError} for an unknown/committed import.
 */
export async function commitImport(
  id: string,
  input: CommitMigakuImportInput,
): Promise<CommitMigakuImportResult> {
  const [row] = await db.select().from(migakuImports).where(eq(migakuImports.id, id));
  if (!row || row.status !== "parsed" || !row.apkgKey) {
    throw new MigakuImportNotFoundError();
  }
  const apkg = await getMedia(row.apkgKey);
  if (!apkg) throw new MigakuImportNotFoundError("Staged import package is no longer available");

  const result = await commitCandidates(apkg.body, storedCandidates(row), input);

  await deleteMedia(row.apkgKey);
  await db.update(migakuImports)
    .set({
      status: "committed",
      apkgKey: null,
      deckName: input.deckName.trim() || row.deckName,
      sentencesCreated: result.sentencesCreated,
      vocabCreated: result.vocabCreated,
      skipped: result.skipped,
    })
    .where(eq(migakuImports.id, id));

  return result;
}

/** Discard a staged import and its package. */
export async function discardImport(id: string): Promise<boolean> {
  const [row] = await db.select().from(migakuImports).where(eq(migakuImports.id, id));
  if (!row) return false;
  await deleteMedia(row.apkgKey);
  await db.delete(migakuImports).where(eq(migakuImports.id, id));
  return true;
}

/**
 * Delete every bank row imported under this import's deck (matched by its `deck:<name>` tag), then
 * remove the import record. Returns null when the import doesn't exist.
 */
export async function deleteImportedDeck(id: string): Promise<DeleteDeckCardsResult | null> {
  const [row] = await db.select().from(migakuImports).where(eq(migakuImports.id, id));
  if (!row) return null;
  const deckName = row.deckName ?? deckNameFromFilename(row.filename);
  const result = await deleteDeckCards(deckName);
  await deleteMedia(row.apkgKey);
  await db.delete(migakuImports).where(eq(migakuImports.id, id));
  return result;
}

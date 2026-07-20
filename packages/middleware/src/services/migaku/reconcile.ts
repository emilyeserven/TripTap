/**
 * Orphan sweep for the media bucket. S3/Garage tracks no last-access time, so "unused" is defined by
 * DB references: any object under the media prefix not pointed at by a sentence/vocab media key or a
 * staged import's package is an orphan. Safe because TripTap owns the bucket exclusively.
 *
 * A grace window skips very recently uploaded objects, so a commit that has written media but not yet
 * inserted its row isn't reaped mid-flight.
 */

import { isNotNull } from "drizzle-orm";
import type { MigakuReconcileResult } from "@sentence-bank/types";
import { db } from "@/db";
import { migakuImports, sentences, shadowingSessions, vocab } from "@/db/schema";
import { deleteMedia, listMediaObjects } from "@/services/media";

/** Default grace window: objects newer than this are left alone. */
const GRACE_MS = 60 * 60 * 1000;

/** Collect every object key currently referenced by a DB row. */
async function liveKeys(): Promise<Set<string>> {
  const [sentenceKeys, vocabKeys, importKeys, shadowingKeys] = await Promise.all([
    db.select({
      audio: sentences.audioKey,
      image: sentences.imageKey,
    }).from(sentences),
    db.select({
      audio: vocab.audioKey,
      image: vocab.imageKey,
    }).from(vocab),
    db.select({
      apkg: migakuImports.apkgKey,
    }).from(migakuImports).where(isNotNull(migakuImports.apkgKey)),
    db.select({
      audio: shadowingSessions.audioKey,
    }).from(shadowingSessions).where(isNotNull(shadowingSessions.audioKey)),
  ]);
  const set = new Set<string>();
  for (const row of sentenceKeys) {
    if (row.audio) set.add(row.audio);
    if (row.image) set.add(row.image);
  }
  for (const row of vocabKeys) {
    if (row.audio) set.add(row.audio);
    if (row.image) set.add(row.image);
  }
  for (const row of importKeys) {
    if (row.apkg) set.add(row.apkg);
  }
  for (const row of shadowingKeys) {
    if (row.audio) set.add(row.audio);
  }
  return set;
}

/**
 * Delete unreferenced media objects. Pass `dryRun` to only count them. `now` is injectable for tests;
 * objects modified within the grace window before `now` are skipped.
 */
export async function reconcileMedia(
  {
    dryRun = false, now = new Date(),
  }: { dryRun?: boolean;
    now?: Date; } = {},
): Promise<MigakuReconcileResult> {
  const [objects, live] = await Promise.all([listMediaObjects(), liveKeys()]);
  const cutoff = now.getTime() - GRACE_MS;

  const orphans = objects.filter((obj) => {
    if (live.has(obj.key)) return false;
    // Within the grace window → not yet safe to reap.
    if (obj.lastModified && obj.lastModified.getTime() > cutoff) return false;
    return true;
  });

  if (!dryRun) {
    for (const orphan of orphans) {
      await deleteMedia(orphan.key);
    }
  }

  return {
    scanned: objects.length,
    live: live.size,
    orphans: orphans.length,
    dryRun,
  };
}

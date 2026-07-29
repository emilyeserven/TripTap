import { eq } from "drizzle-orm";
import type {
  Correction,
  CorrectionImportCandidate,
  CorrectionImportKind,
  CorrectionImportRef,
} from "@sentence-bank/types";
import { db } from "@/db";
import { answerSheets, corrections, mySentences, writings } from "@/db/schema";
import { createCorrection } from "@/services/corrections";

/**
 * Import corrected learner output that already lives embedded in other entities into the triage
 * pipeline. Three sources, each holding an (original, corrected) pair in a different shape:
 *
 *  - My Sentences: `text` (original) + `correction`, with `explanation` as the note.
 *  - Writings: each inline `WritingCorrection` (`original`/`corrected`/`note`).
 *  - Answer sheets: each `AnswerSheetEntry` with a `correction` (`value` is the original).
 *
 * A composite `ref.id` (`entityId:childId` for the array-backed sources) makes every candidate
 * addressable and lets us skip anything already imported.
 */

/** The set of `importedFrom.id`s already imported for a given source kind (so we never double-import). */
async function importedIds(kind: CorrectionImportKind): Promise<Set<string>> {
  const rows = await db
    .select({
      importedFrom: corrections.importedFrom,
    })
    .from(corrections);
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.importedFrom && row.importedFrom.kind === kind) ids.add(row.importedFrom.id);
  }
  return ids;
}

async function mySentenceCandidates(): Promise<CorrectionImportCandidate[]> {
  const rows = await db.select().from(mySentences);
  const out: CorrectionImportCandidate[] = [];
  for (const row of rows) {
    if (!row.correction?.trim()) continue;
    out.push({
      ref: {
        kind: "my_sentence",
        id: row.id,
      },
      original: row.text,
      corrected: row.correction,
      correctorNote: row.explanation ?? null,
      context: row.translation ?? null,
      label: null,
    });
  }
  return out;
}

async function writingCandidates(): Promise<CorrectionImportCandidate[]> {
  const rows = await db.select().from(writings);
  const out: CorrectionImportCandidate[] = [];
  for (const row of rows) {
    for (const correction of row.corrections ?? []) {
      if (!correction.original?.trim() || !correction.corrected?.trim()) continue;
      out.push({
        ref: {
          kind: "writing",
          id: `${row.id}:${correction.id}`,
        },
        original: correction.original,
        corrected: correction.corrected,
        correctorNote: correction.note ?? null,
        context: null,
        label: row.date,
      });
    }
  }
  return out;
}

async function answerSheetCandidates(): Promise<CorrectionImportCandidate[]> {
  const rows = await db.select().from(answerSheets);
  const out: CorrectionImportCandidate[] = [];
  for (const row of rows) {
    for (const entry of row.entries ?? []) {
      if (!entry.value?.trim() || !entry.correction?.trim()) continue;
      out.push({
        ref: {
          kind: "answer_sheet",
          id: `${row.id}:${entry.slotId}`,
        },
        original: entry.value,
        corrected: entry.correction,
        correctorNote: entry.reasoning ?? null,
        context: entry.intendedMeaning ?? null,
        label: row.title ?? null,
      });
    }
  }
  return out;
}

/** All not-yet-imported candidates for one source kind. */
export async function listImportCandidates(
  kind: CorrectionImportKind,
): Promise<CorrectionImportCandidate[]> {
  const [candidates, seen] = await Promise.all([
    kind === "my_sentence"
      ? mySentenceCandidates()
      : kind === "writing"
        ? writingCandidates()
        : answerSheetCandidates(),
    importedIds(kind),
  ]);
  return candidates.filter(c => !seen.has(c.ref.id));
}

/** Resolve one ref back to its candidate (re-read from the source, so the client can't spoof text). */
async function resolveRef(ref: CorrectionImportRef): Promise<CorrectionImportCandidate | null> {
  if (ref.kind === "my_sentence") {
    const [row] = await db.select().from(mySentences).where(eq(mySentences.id, ref.id));
    if (!row?.correction?.trim()) return null;
    return {
      ref,
      original: row.text,
      corrected: row.correction,
      correctorNote: row.explanation ?? null,
      context: row.translation ?? null,
      label: null,
    };
  }
  // The array-backed sources address a child by `entityId:childId`.
  const [entityId, childId] = ref.id.split(":");
  if (!entityId || !childId) return null;
  if (ref.kind === "writing") {
    const [row] = await db.select().from(writings).where(eq(writings.id, entityId));
    const correction = row?.corrections?.find(c => c.id === childId);
    if (!correction?.original?.trim() || !correction.corrected?.trim()) return null;
    return {
      ref,
      original: correction.original,
      corrected: correction.corrected,
      correctorNote: correction.note ?? null,
      context: null,
      label: row?.date ?? null,
    };
  }
  const [row] = await db.select().from(answerSheets).where(eq(answerSheets.id, entityId));
  const entry = row?.entries?.find(e => e.slotId === childId);
  if (!entry?.value?.trim() || !entry.correction?.trim()) return null;
  return {
    ref,
    original: entry.value,
    corrected: entry.correction,
    correctorNote: entry.reasoning ?? null,
    context: entry.intendedMeaning ?? null,
    label: row?.title ?? null,
  };
}

/**
 * Import the given refs as fresh corrections under one batch, re-resolving each from its source and
 * skipping any already imported. Returns the created corrections.
 */
export async function importCorrections(
  refs: CorrectionImportRef[],
  batchId?: string | null,
): Promise<Correction[]> {
  const batch = batchId ?? crypto.randomUUID();
  // One dedup snapshot per kind up front, then track ids we add so a batch can't import a dup of itself.
  const seenByKind = new Map<CorrectionImportKind, Set<string>>();
  const created: Correction[] = [];
  for (const ref of refs) {
    let seen = seenByKind.get(ref.kind);
    if (!seen) {
      seen = await importedIds(ref.kind);
      seenByKind.set(ref.kind, seen);
    }
    if (seen.has(ref.id)) continue;
    const candidate = await resolveRef(ref);
    if (!candidate) continue;
    const correction = await createCorrection({
      original: candidate.original,
      corrected: candidate.corrected,
      correctorNote: candidate.correctorNote,
      context: candidate.context,
      source: "self",
      importedFrom: ref,
      batchId: batch,
    });
    seen.add(ref.id);
    created.push(correction);
  }
  return created;
}

import { eq } from "drizzle-orm";
import type {
  Correction,
  CorrectionImportCandidate,
  CorrectionImportKind,
  CorrectionImportRef,
  SentenceTermRef,
} from "@sentence-bank/types";
import { grammarTermsOf } from "@sentence-bank/types";
import { db } from "@/db";
import { answerSheets, corrections, mySentences, questionSheets, writings } from "@/db/schema";
import { createCorrection } from "@/services/corrections";

/** The Grammar-channel tags on a term list stored in the all-channels shape. */
function grammarTermsIn(terms: SentenceTermRef[] | null | undefined): SentenceTermRef[] {
  return grammarTermsOf({
    terms,
  });
}

/**
 * Split free-form text into sentence segments (mirrors the client's `splitSentences`): a boundary is a
 * run of terminal punctuation (。！？.!?) or the end of a non-empty line. Used to offer a writing's raw,
 * uncorrected lines as no-fix candidates.
 */
function splitSentences(text: string): string[] {
  const segments: string[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const matches = line.match(/[^。！？.!?]*[。！？.!?]+|[^。！？.!?]+$/g) ?? [line];
    for (const m of matches) {
      const trimmed = m.trim();
      if (trimmed) segments.push(trimmed);
    }
  }
  return segments;
}

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
    if (!row.text?.trim()) continue;
    out.push({
      ref: {
        kind: "my_sentence",
        id: row.id,
      },
      original: row.text,
      // Null when the sentence has no correction yet — a non-correction sentence.
      corrected: row.correction?.trim() ? row.correction : null,
      correctorNote: row.explanation ?? null,
      context: row.translation ?? null,
      label: null,
      grammarTerms: grammarTermsIn(row.terms),
    });
  }
  return out;
}

async function writingCandidates(): Promise<CorrectionImportCandidate[]> {
  const rows = await db.select().from(writings);
  const out: CorrectionImportCandidate[] = [];
  for (const row of rows) {
    // A writing's grammar tags apply to the whole piece, so surface them on each of its lines.
    const grammarTerms = grammarTermsIn(row.terms);
    const correctedOriginals = new Set<string>();
    for (const correction of row.corrections ?? []) {
      if (!correction.original?.trim() || !correction.corrected?.trim()) continue;
      correctedOriginals.add(correction.original.trim());
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
        grammarTerms,
      });
    }
    // The writing's raw, uncorrected lines — non-correction sentences. Indexed by position so the
    // import can re-resolve them; skip lines already offered as a correction above.
    if (row.text?.trim()) {
      splitSentences(row.text).forEach((line, idx) => {
        if (correctedOriginals.has(line.trim())) return;
        out.push({
          ref: {
            kind: "writing",
            id: `${row.id}:line:${idx}`,
          },
          original: line,
          corrected: null,
          correctorNote: null,
          context: null,
          label: row.date,
          grammarTerms,
        });
      });
    }
  }
  return out;
}

async function answerSheetCandidates(): Promise<CorrectionImportCandidate[]> {
  const [rows, sheets] = await Promise.all([
    db.select().from(answerSheets),
    db.select({
      id: questionSheets.id,
      grammarTerms: questionSheets.grammarTerms,
    }).from(questionSheets),
  ]);
  // An answer sheet's grammar tags live on its parent question sheet.
  const grammarByQuestionSheet = new Map(sheets.map(s => [s.id, grammarTermsIn(s.grammarTerms)]));
  const out: CorrectionImportCandidate[] = [];
  for (const row of rows) {
    const grammarTerms = grammarByQuestionSheet.get(row.questionSheetId) ?? [];
    for (const entry of row.entries ?? []) {
      if (!entry.value?.trim()) continue;
      out.push({
        ref: {
          kind: "answer_sheet",
          id: `${row.id}:${entry.slotId}`,
        },
        original: entry.value,
        // Null when the answer has no correction — a non-correction sentence.
        corrected: entry.correction?.trim() ? entry.correction : null,
        correctorNote: entry.reasoning ?? null,
        context: entry.intendedMeaning ?? null,
        label: row.title ?? null,
        grammarTerms,
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

/**
 * Resolve one ref back to its candidate (re-read from the source, so the client can't spoof text).
 * `corrected` is null when the source sentence has no fix. Import doesn't carry tags onto the
 * Correction, so `grammarTerms` is always empty here.
 */
async function resolveRef(ref: CorrectionImportRef): Promise<CorrectionImportCandidate | null> {
  if (ref.kind === "my_sentence") {
    const [row] = await db.select().from(mySentences).where(eq(mySentences.id, ref.id));
    if (!row?.text?.trim()) return null;
    return {
      ref,
      original: row.text,
      corrected: row.correction?.trim() ? row.correction : null,
      correctorNote: row.explanation ?? null,
      context: row.translation ?? null,
      label: null,
      grammarTerms: [],
    };
  }
  // The array-backed sources address a child by `entityId:childId` (or `writingId:line:index`).
  const parts = ref.id.split(":");
  const entityId = parts[0];
  if (!entityId) return null;
  if (ref.kind === "writing") {
    const [row] = await db.select().from(writings).where(eq(writings.id, entityId));
    if (!row) return null;
    if (parts[1] === "line") {
      // A raw, uncorrected writing line addressed by its position in the split text.
      const line = row.text ? splitSentences(row.text)[Number(parts[2])] : undefined;
      if (!line?.trim()) return null;
      return {
        ref,
        original: line,
        corrected: null,
        correctorNote: null,
        context: null,
        label: row.date ?? null,
        grammarTerms: [],
      };
    }
    const correction = row.corrections?.find(c => c.id === parts[1]);
    if (!correction?.original?.trim()) return null;
    return {
      ref,
      original: correction.original,
      corrected: correction.corrected?.trim() ? correction.corrected : null,
      correctorNote: correction.note ?? null,
      context: null,
      label: row.date ?? null,
      grammarTerms: [],
    };
  }
  const childId = parts[1];
  if (!childId) return null;
  const [row] = await db.select().from(answerSheets).where(eq(answerSheets.id, entityId));
  const entry = row?.entries?.find(e => e.slotId === childId);
  if (!entry?.value?.trim()) return null;
  return {
    ref,
    original: entry.value,
    corrected: entry.correction?.trim() ? entry.correction : null,
    correctorNote: entry.reasoning ?? null,
    context: entry.intendedMeaning ?? null,
    label: row?.title ?? null,
    grammarTerms: [],
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

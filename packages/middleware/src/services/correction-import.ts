import type {
  Correction,
  CorrectionImportCandidate,
  CorrectionImportKind,
  CorrectionImportRef,
  SentenceTermRef,
} from "@sentence-bank/types";
import { grammarTermsOf, splitSentences } from "@sentence-bank/types";
import { db } from "@/db";
import {
  answerSheets,
  corrections,
  mySentences,
  practiceSentences,
  questionSheets,
  readingSessions,
  writings,
} from "@/db/schema";
import { createCorrection } from "@/services/corrections";

/** The Grammar-channel tags on a term list stored in the all-channels shape. */
function grammarTermsIn(terms: SentenceTermRef[] | null | undefined): SentenceTermRef[] {
  return grammarTermsOf({
    terms,
  });
}

/** Trimmed text, or null when there is none — the shape every candidate field wants. */
function orNull(value: string | null | undefined): string | null {
  return value?.trim() ? value : null;
}

/**
 * Import corrected learner output that already lives embedded in other entities into the triage
 * pipeline. Each source holds an (original, corrected) pair in its own shape:
 *
 *  - My Sentences: `text` (original) + `correction`, with `explanation` as the note.
 *  - Writings: each inline `WritingCorrection` (`original`/`corrected`/`note`), plus the raw
 *    uncorrected lines as no-fix candidates.
 *  - Answer sheets: each `AnswerSheetEntry` with a `correction` (`value` is the original).
 *  - Reading sessions: the learner's translation (per line, and the freeform one) against the
 *    reference translation stored as its `correction`.
 *  - Practice sentences: `text` + `correction`.
 *
 * A composite `ref.id` (`entityId:childId` for the array-backed sources) makes every candidate
 * addressable and lets us skip anything already imported.
 *
 * There is exactly one extraction per source, in {@link BUILDERS}. Resolving a single ref re-runs
 * its source's builder and picks the matching id rather than re-deriving the mapping — previously
 * every source was written out twice (once to list candidates, once to resolve one), which is how
 * two sources ended up listed but not resolvable.
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

async function readingSessionCandidates(): Promise<CorrectionImportCandidate[]> {
  const rows = await db.select().from(readingSessions);
  const out: CorrectionImportCandidate[] = [];
  for (const row of rows) {
    // Per line: the learner's translation is the original; the reference translation is the fix, and
    // the source line is the context that makes the pair readable in triage.
    for (const line of row.lines ?? []) {
      if (!line.translation?.trim()) continue;
      out.push({
        ref: {
          kind: "reading_session",
          id: `${row.id}:${line.id}`,
        },
        original: line.translation,
        corrected: orNull(line.correction),
        correctorNote: orNull(line.note),
        context: orNull(line.text),
        label: row.title,
        grammarTerms: line.grammarTerms ?? [],
      });
    }
    if (row.freeformTranslation?.trim()) {
      out.push({
        ref: {
          kind: "reading_session",
          id: `${row.id}:freeform`,
        },
        original: row.freeformTranslation,
        corrected: orNull(row.freeformCorrection),
        correctorNote: orNull(row.freeformNote),
        context: orNull(row.passage),
        label: row.title,
        grammarTerms: [],
      });
    }
  }
  return out;
}

async function practiceSentenceCandidates(): Promise<CorrectionImportCandidate[]> {
  const rows = await db.select().from(practiceSentences);
  const out: CorrectionImportCandidate[] = [];
  for (const row of rows) {
    if (!row.text?.trim()) continue;
    out.push({
      ref: {
        kind: "practice_sentence",
        id: row.id,
      },
      original: row.text,
      corrected: orNull(row.correction),
      correctorNote: null,
      context: orNull(row.translation),
      label: null,
      grammarTerms: grammarTermsIn(row.terms),
    });
  }
  return out;
}

/** The single extraction per source. Everything else dispatches through here. */
const BUILDERS: Record<CorrectionImportKind, () => Promise<CorrectionImportCandidate[]>> = {
  my_sentence: mySentenceCandidates,
  writing: writingCandidates,
  answer_sheet: answerSheetCandidates,
  reading_session: readingSessionCandidates,
  practice_sentence: practiceSentenceCandidates,
};

/** All not-yet-imported candidates for one source kind. */
export async function listImportCandidates(
  kind: CorrectionImportKind,
): Promise<CorrectionImportCandidate[]> {
  const [candidates, seen] = await Promise.all([BUILDERS[kind](), importedIds(kind)]);
  return candidates.filter(c => !seen.has(c.ref.id));
}

/**
 * Resolve one ref back to its candidate, re-read from the source so the client can't spoof the text.
 * `corrected` is null when the source sentence has no fix.
 */
async function resolveRef(ref: CorrectionImportRef): Promise<CorrectionImportCandidate | null> {
  const candidates = await BUILDERS[ref.kind]();
  return candidates.find(c => c.ref.id === ref.id) ?? null;
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

/**
 * Types for importing Migaku `.apkg` decks (legacy uncompressed Anki packages) into the bank.
 *
 * Flow: upload an `.apkg` → the server parses it into {@link MigakuCandidate}s and stages the raw
 * file → the user reviews/edits the candidates → commit creates Sentences/Vocab (with media pulled
 * from object storage). See `services/migaku` in the middleware.
 */

import type { FuriToken } from "./index.js";

/** Which bank entity a candidate becomes when committed. */
export type MigakuCandidateKind = "sentence" | "vocab";

/**
 * One card extracted from an uploaded `.apkg`, presented for review before commit. Media bytes are
 * never inlined — `hasAudio`/`hasImage` flag their presence and they preview via
 * `/api/migaku-imports/:id/candidates/:candidateId/audio|image`.
 */
export interface MigakuCandidate {
  /** Stable id within this import (assigned at parse time). */
  id: string;
  /** Auto-detected target; the user may override it in the review table. */
  kind: MigakuCandidateKind;
  /** Sentence text / vocab term, with Migaku ruby syntax already stripped to plain text. */
  text: string;
  /** Parsed furigana from Migaku's `漢字[かな]` syntax; empty when the card carried no readings. */
  reading: FuriToken[];
  /** Meaning/translation from the card's Meaning field, or null. */
  meaning: string | null;
  /**
   * The focus-word explanation (Migaku's Notes field) for a vocab candidate, or null. Distinct from
   * {@link meaning} (the dictionary gloss / sentence translation); only populated on the Migaku path.
   */
  notes: string | null;
  /** Comma-separated tags carried from the Anki note (always includes `migaku`). */
  tags: string | null;
  /** True when the card references an audio file present in the package. */
  hasAudio: boolean;
  /** True when the card references an image present in the package. */
  hasImage: boolean;
  /**
   * True when a matching row already exists in the bank (same text as a sentence, or same term as a
   * vocab item). Such candidates are deselected by default and skipped on commit to avoid duplicates.
   */
  alreadyExists: boolean;
}

/**
 * How a note maps to bank rows. `"migaku"` = the Migaku "Sentence" note type, where each note becomes
 * a focus Vocab + its example Sentence(s), linked; `"generic"` = any other `.apkg`, one flat row per
 * note (a sentence *or* vocab). Drives which review UI the client shows.
 */
export type MigakuImportFormat = "migaku" | "generic";

/** Where a note's image is attached on commit (user's per-note choice; Migaku path only). */
export type MigakuImageTarget = "none" | "sentence" | "vocab" | "both";

/**
 * Groups a Migaku note's candidates: one focus vocab plus the example sentence(s) it teaches. The ids
 * reference entries in {@link MigakuImportDetail.candidates}; the group carries the intent to link them
 * via `sentence_vocab` on commit.
 */
export interface MigakuNoteGroup {
  /** Stable group id (the source Anki note). */
  id: string;
  /** Candidate id of the focus vocab, or null when the note had no usable Word. */
  vocabId: string | null;
  /** Candidate ids of the example sentence(s), in order. */
  sentenceIds: string[];
  /** Whether the note carried an image (attachable to the sentence and/or vocab on commit). */
  hasImage: boolean;
}

/** A staged `.apkg` import. The raw package lives in object storage until committed or discarded. */
export interface MigakuImport {
  id: string;
  /** Original uploaded filename, e.g. "Japanese.apkg". */
  filename: string;
  /** Whether this import uses the paired Migaku mapping or the generic single-row importer. */
  format: MigakuImportFormat;
  /** Deck name (parsed from the `.apkg`, or derived from the filename); editable before commit. */
  deckName: string;
  /** `"parsed"` = awaiting review; `"committed"` = promoted to bank rows. */
  status: "parsed" | "committed";
  /** How many candidates were extracted. */
  candidateCount: number;
  /** Sentences created at commit; null until committed. */
  sentencesCreated: number | null;
  /** Vocab created at commit; null until committed. */
  vocabCreated: number | null;
  /** Candidates skipped as duplicates at commit; null until committed. */
  skipped: number | null;
  createdAt: string;
}

/** A staged import plus its candidates, returned when opening the review page. */
export interface MigakuImportDetail extends MigakuImport {
  candidates: MigakuCandidate[];
  /** Vocab↔sentence groupings for the Migaku path; empty for the generic path. */
  noteGroups: MigakuNoteGroup[];
}

/** What to do with a candidate that already matches a bank row (Migaku path). */
export type MigakuDedupAction = "link" | "skip" | "new";

/** One reviewed candidate in a commit request — edits from the review table are folded in here. */
export interface CommitMigakuItemInput {
  id: string;
  /** Skip this candidate when false. */
  include: boolean;
  /** Final target (possibly overridden from the detected kind). */
  kind: MigakuCandidateKind;
  /** Edited sentence text / vocab term. */
  text: string;
  /** Edited meaning/translation, or null. */
  meaning?: string | null;
  /** Edited focus-word explanation (vocab notes), or null. */
  notes?: string | null;
  /** Edited tags, or null. */
  tags?: string | null;
  /**
   * How to handle a duplicate (when the row already exists). `"link"` reuses the existing row (and,
   * for the Migaku path, links it), `"skip"` drops it, `"new"` creates a duplicate anyway. Defaults to
   * `"link"`. Ignored for non-duplicates.
   */
  dedupAction?: MigakuDedupAction;
}

/** Per-note linking + image intent for the Migaku path (keyed by {@link MigakuNoteGroup.id}). */
export interface CommitMigakuGroupInput {
  id: string;
  /** Link the group's created/linked sentences to its vocab via `sentence_vocab`. */
  link: boolean;
  /** Where to attach the note's image. */
  imageTarget: MigakuImageTarget;
}

/** Payload for committing a reviewed import into the bank. */
export interface CommitMigakuImportInput {
  /** Target language stamped on every created row, e.g. "Japanese". */
  language: string;
  /** Deck name tagged onto every created row (as `deck:<name>`). */
  deckName: string;
  items: CommitMigakuItemInput[];
  /** Group linking/image intent (Migaku path). Omitted/empty for the generic path. */
  groups?: CommitMigakuGroupInput[];
}

/** Result of committing an import. */
export interface CommitMigakuImportResult {
  sentencesCreated: number;
  vocabCreated: number;
  /** How many `sentence_vocab` links were written (Migaku path). */
  linksCreated: number;
  /** How many kept items were skipped because a matching row already existed. */
  skipped: number;
}

/** Result of deleting all bank rows imported under a deck. */
export interface DeleteDeckCardsResult {
  sentencesDeleted: number;
  vocabDeleted: number;
}

/**
 * Deck tags. Imported rows are tagged `deck:<name>` in their free-text `tags` column so they can be
 * filtered and bulk-deleted by deck. Shared between middleware (tagging + deletion) and client
 * (filter dropdown) so the format lives in one place.
 */
export const DECK_TAG_PREFIX = "deck:";

/** Build the deck tag for a name (commas stripped so it can't break the comma-separated `tags`). */
export function deckTag(deckName: string): string {
  return `${DECK_TAG_PREFIX}${deckName.replace(/,/g, " ").trim()}`;
}

/** Extract the deck names from a comma-separated `tags` string (the `deck:` prefix removed). */
export function deckNamesFromTags(tags: string | null | undefined): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map(t => t.trim())
    .filter(t => t.startsWith(DECK_TAG_PREFIX))
    .map(t => t.slice(DECK_TAG_PREFIX.length))
    .filter(Boolean);
}

/** Whether a `tags` string carries the tag for the given deck. */
export function hasDeckTag(tags: string | null | undefined, deckName: string): boolean {
  return deckNamesFromTags(tags).includes(deckName.replace(/,/g, " ").trim());
}

/** Config status of the media object store, shown on the Settings page. Never includes secrets. */
export interface MediaStorageStatus {
  /** True when the essential S3/Garage env vars are all set. */
  configured: boolean;
  /** The configured endpoint URL (not a secret), or null when unconfigured. */
  endpoint: string | null;
  /** The configured bucket name, or null. */
  bucket: string | null;
  /** The configured region label, or null. */
  region: string | null;
}

/** Per-operation outcome of a live media-storage connectivity test. */
export interface MediaConnectionChecks {
  list: boolean;
  write: boolean;
  read: boolean;
  delete: boolean;
}

/** Result of the Settings "Test connection" round-trip against the bucket. */
export interface MediaConnectionTestResult {
  /** True only when every check passed. */
  ok: boolean;
  checks: MediaConnectionChecks;
  /** The failure reason when `ok` is false, else null. */
  error: string | null;
}

/** Result of a media reconciliation sweep of the object-storage bucket. */
export interface MigakuReconcileResult {
  /** Objects listed under the media prefix. */
  scanned: number;
  /** Objects still referenced by a sentence/vocab row. */
  live: number;
  /** Unreferenced objects deleted (or that would be deleted in a dry run). */
  orphans: number;
  /** True when nothing was actually deleted. */
  dryRun: boolean;
}

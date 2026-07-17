import type { MigakuCandidate } from "@sentence-bank/types";

/**
 * A candidate as persisted in the staging row's `candidates` jsonb: the public {@link MigakuCandidate}
 * plus the original media filenames it referenced, kept server-side so the bytes can be pulled from the
 * stored `.apkg` at commit time. The filenames are stripped before the candidate is sent to the client.
 */
export interface StoredMigakuCandidate extends Omit<MigakuCandidate, "alreadyExists"> {
  /** Original filename of the card's audio in the package (e.g. "front.mp3"), or null. */
  audioFile: string | null;
  /** Original filename of the card's image in the package (e.g. "pic.jpg"), or null. */
  imageFile: string | null;
}

/**
 * Project a stored candidate to its public wire shape (drops internal media filenames). `alreadyExists`
 * is computed fresh against the current bank at read time, not persisted.
 */
export function toPublicCandidate(
  stored: StoredMigakuCandidate,
  alreadyExists: boolean,
): MigakuCandidate {
  return {
    id: stored.id,
    kind: stored.kind,
    text: stored.text,
    reading: stored.reading,
    meaning: stored.meaning,
    tags: stored.tags,
    hasAudio: stored.hasAudio,
    hasImage: stored.hasImage,
    alreadyExists,
  };
}

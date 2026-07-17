/**
 * Commit a reviewed import: create Sentence/Vocab rows from the kept candidates, pulling each card's
 * media out of the stored `.apkg` and into object storage. Runs server-side with direct inserts so a
 * card's Migaku-derived furigana and media land on the row in one write (bypassing the furigana
 * auto-generation that the normal create path would do).
 */

import type {
  CommitMigakuImportInput,
  CommitMigakuImportResult,
  FuriToken,
} from "@sentence-bank/types";
import { deckTag } from "@sentence-bank/types";
import { db } from "@/db";
import { sentences, vocab } from "@/db/schema";
import { newId } from "@/lib/id";
import { generateFurigana } from "@/services/furigana";
import { MEDIA_PREFIX, putMedia } from "@/services/media";
import { extractApkgMedia, mimeForFilename } from "@/services/migaku/apkg";
import { getExistingKeysForLanguage } from "@/services/migaku/dedup";
import type { StoredMigakuCandidate } from "@/services/migaku/types";

/** Object-storage key for a piece of imported media, namespaced under the app's media prefix. */
function mediaKey(filename: string): string {
  const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : "";
  return `${MEDIA_PREFIX}${newId()}${ext}`;
}

/** Merge a deck tag into a comma-separated `tags` string, deduped. */
function withDeckTag(tags: string, deck: string): string {
  const list = tags.split(",").map(t => t.trim()).filter(Boolean);
  if (!list.includes(deck)) list.push(deck);
  return list.join(", ");
}

interface ResolvedMedia {
  audioKey: string | null;
  audioMime: string | null;
  imageKey: string | null;
  imageMime: string | null;
}

/** Upload a candidate's audio/image from the stored package to object storage, returning their keys. */
async function storeMedia(apkg: Buffer, candidate: StoredMigakuCandidate): Promise<ResolvedMedia> {
  const resolved: ResolvedMedia = {
    audioKey: null,
    audioMime: null,
    imageKey: null,
    imageMime: null,
  };
  if (candidate.audioFile) {
    const media = extractApkgMedia(apkg, candidate.audioFile);
    if (media) {
      resolved.audioKey = await putMedia(mediaKey(candidate.audioFile), media.body, media.mime);
      resolved.audioMime = media.mime ?? mimeForFilename(candidate.audioFile);
    }
  }
  if (candidate.imageFile) {
    const media = extractApkgMedia(apkg, candidate.imageFile);
    if (media) {
      resolved.imageKey = await putMedia(mediaKey(candidate.imageFile), media.body, media.mime);
      resolved.imageMime = media.mime ?? mimeForFilename(candidate.imageFile);
    }
  }
  return resolved;
}

/**
 * Create bank rows from the kept candidates. `apkg` is the raw package (re-fetched from storage) used
 * to extract media; `stored` is the parsed candidate set to look up per-item media references.
 */
export async function commitCandidates(
  apkg: Buffer,
  stored: StoredMigakuCandidate[],
  input: CommitMigakuImportInput,
): Promise<CommitMigakuImportResult> {
  const byId = new Map(stored.map(c => [c.id, c]));
  const kept = input.items.filter(item => item.include && item.text.trim());
  const deck = input.deckName.trim() ? deckTag(input.deckName) : null;

  // Authoritative dedup: never create a row whose text/term already exists for this language. The sets
  // grow as we insert, so duplicates within this same batch are also collapsed.
  const existing = await getExistingKeysForLanguage(input.language);

  let sentencesCreated = 0;
  let vocabCreated = 0;
  let skipped = 0;

  for (const item of kept) {
    const text = item.text.trim();
    const seen = item.kind === "sentence" ? existing.sentenceTexts : existing.vocabTerms;
    if (seen.has(text)) {
      skipped += 1;
      continue;
    }
    seen.add(text);
    const source = byId.get(item.id);
    const media = source
      ? await storeMedia(apkg, source)
      : {
        audioKey: null,
        audioMime: null,
        imageKey: null,
        imageMime: null,
      };
    const baseTags = item.tags ?? source?.tags ?? "migaku";
    const tags = deck ? withDeckTag(baseTags, deck) : baseTags;

    if (item.kind === "sentence") {
      // Prefer the card's Migaku furigana; fall back to generating it when the card had none.
      let reading: FuriToken[] | null = source?.reading?.length ? source.reading : null;
      let readingError: string | null = null;
      if (!reading) {
        const generated = await generateFurigana(item.text);
        reading = generated.tokens;
        readingError = generated.error;
      }
      await db.insert(sentences).values({
        text: item.text,
        translation: item.meaning ?? source?.meaning ?? null,
        reading,
        readingError,
        language: input.language,
        tags,
        ...media,
      });
      sentencesCreated += 1;
    }
    else {
      // Vocab readings are a plain kana string, not a segmentation — flatten the furigana.
      const readingStr = source?.reading?.length
        ? source.reading.map(t => t.r ?? t.t).join("")
        : null;
      await db.insert(vocab).values({
        term: item.text,
        reading: readingStr,
        meaning: item.meaning ?? source?.meaning ?? null,
        language: input.language,
        tags,
        audioKey: media.audioKey,
        audioMime: media.audioMime,
        imageKey: media.imageKey,
        imageMime: media.imageMime,
      });
      vocabCreated += 1;
    }
  }

  return {
    sentencesCreated,
    vocabCreated,
    skipped,
  };
}

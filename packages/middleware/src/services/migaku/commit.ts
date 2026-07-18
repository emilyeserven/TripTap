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
import { sentences, sentenceVocab, vocab } from "@/db/schema";
import { newId } from "@/lib/id";
import { generateFurigana } from "@/services/furigana";
import { MEDIA_PREFIX, putMedia } from "@/services/media";
import { extractApkgMedia, mimeForFilename } from "@/services/migaku/apkg";
import { getExistingIdsForLanguage, getExistingKeysForLanguage } from "@/services/migaku/dedup";
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

interface StoredFile {
  key: string;
  mime: string;
}

/** Upload one media file from the stored package to object storage, or null when it isn't present. */
async function storeMediaFile(apkg: Buffer, filename: string): Promise<StoredFile | null> {
  const media = extractApkgMedia(apkg, filename);
  if (!media) return null;
  const key = await putMedia(mediaKey(filename), media.body, media.mime);
  return {
    key,
    mime: media.mime ?? mimeForFilename(filename),
  };
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
 * to extract media; `stored` is the parsed candidate set to look up per-item media references. Routes
 * to the paired Migaku path when the candidates were parsed as grouped notes, else the generic path.
 */
export async function commitCandidates(
  apkg: Buffer,
  stored: StoredMigakuCandidate[],
  input: CommitMigakuImportInput,
): Promise<CommitMigakuImportResult> {
  if (stored.some(c => c.groupId)) return commitMigakuGroups(apkg, stored, input);
  return commitFlat(apkg, stored, input);
}

/** Generic single-row commit: each kept candidate becomes one sentence or vocab row, unlinked. */
async function commitFlat(
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
    linksCreated: 0,
    skipped,
  };
}

/** A note's candidates regrouped for commit: one focus vocab plus the example sentence(s). */
interface CommitGroup {
  vocab?: StoredMigakuCandidate;
  sentences: StoredMigakuCandidate[];
}

/** Flatten a vocab candidate's furigana tokens to the plain kana string the vocab column stores. */
function flattenReading(candidate: StoredMigakuCandidate | undefined): string | null {
  return candidate?.reading?.length
    ? candidate.reading.map(t => t.r ?? t.t).join("")
    : null;
}

/**
 * Paired Migaku commit: each note becomes a focus Vocab + its example Sentence(s), linked via
 * `sentence_vocab`. Per row the user's `dedupAction` decides whether a duplicate links to the existing
 * row, is skipped, or is created anew; the group's `imageTarget` decides where the note's image lands.
 */
async function commitMigakuGroups(
  apkg: Buffer,
  stored: StoredMigakuCandidate[],
  input: CommitMigakuImportInput,
): Promise<CommitMigakuImportResult> {
  const itemById = new Map(input.items.map(i => [i.id, i]));
  const groupInputById = new Map((input.groups ?? []).map(g => [g.id, g]));
  const deck = input.deckName.trim() ? deckTag(input.deckName) : null;
  const tagsFor = (item: { tags?: string | null } | undefined, source: StoredMigakuCandidate) => {
    const base = item?.tags ?? source.tags ?? "migaku";
    return deck ? withDeckTag(base, deck) : base;
  };

  // Regroup the flat stored candidates by note, preserving first-seen order.
  const groups = new Map<string, CommitGroup>();
  const order: string[] = [];
  for (const c of stored) {
    if (!c.groupId) continue;
    let group = groups.get(c.groupId);
    if (!group) {
      group = {
        sentences: [],
      };
      groups.set(c.groupId, group);
      order.push(c.groupId);
    }
    if (c.kind === "vocab") group.vocab = c;
    else group.sentences.push(c);
  }

  // `existing` (sets) drives the default skip; `existingIds` resolves a "link to existing" target.
  const existing = await getExistingKeysForLanguage(input.language);
  const existingIds = await getExistingIdsForLanguage(input.language);

  let sentencesCreated = 0;
  let vocabCreated = 0;
  let linksCreated = 0;
  let skipped = 0;

  for (const groupId of order) {
    const group = groups.get(groupId);
    if (!group) continue;
    const groupInput = groupInputById.get(groupId);
    const wantLink = groupInput?.link ?? true;
    const imageTarget = groupInput?.imageTarget ?? "sentence";

    // The note's image (attached to a sentence candidate) is stored once and shared across targets.
    const imageFile = group.sentences.find(s => s.imageFile)?.imageFile ?? null;
    let sharedImage: StoredFile | null | undefined;
    const resolveImage = async (): Promise<StoredFile | null> => {
      if (sharedImage === undefined) sharedImage = imageFile ? await storeMediaFile(apkg, imageFile) : null;
      return sharedImage;
    };

    // ── Focus vocab ──
    let vocabId: string | null = null;
    if (group.vocab) {
      const item = itemById.get(group.vocab.id);
      if (item?.include && item.text.trim()) {
        const term = item.text.trim();
        const action = item.dedupAction ?? "link";
        const exists = existing.vocabTerms.has(term);
        if (exists && action === "skip") {
          skipped += 1;
        }
        else if (exists && action === "link") {
          vocabId = existingIds.vocabIds.get(term) ?? null;
        }
        if (!vocabId && !(exists && action === "skip")) {
          const wordAudio = group.vocab.audioFile ? await storeMediaFile(apkg, group.vocab.audioFile) : null;
          const image = imageTarget === "vocab" || imageTarget === "both" ? await resolveImage() : null;
          const [row] = await db.insert(vocab).values({
            term,
            reading: flattenReading(group.vocab),
            meaning: item.meaning ?? group.vocab.meaning ?? null,
            notes: item.notes ?? group.vocab.notes ?? null,
            language: input.language,
            tags: tagsFor(item, group.vocab),
            audioKey: wordAudio?.key ?? null,
            audioMime: wordAudio?.mime ?? null,
            imageKey: image?.key ?? null,
            imageMime: image?.mime ?? null,
          }).returning({
            id: vocab.id,
          });
          vocabId = row.id;
          vocabCreated += 1;
          existing.vocabTerms.add(term);
          existingIds.vocabIds.set(term, vocabId);
        }
      }
    }

    // ── Example sentence(s) ──
    for (const sentence of group.sentences) {
      const item = itemById.get(sentence.id);
      if (!item?.include || !item.text.trim()) continue;
      const text = item.text.trim();
      const action = item.dedupAction ?? "link";
      const exists = existing.sentenceTexts.has(text);
      let sentenceId: string | null = null;

      if (exists && action === "skip") {
        skipped += 1;
        continue;
      }
      if (exists && action === "link") {
        sentenceId = existingIds.sentenceIds.get(text) ?? null;
      }
      if (!sentenceId) {
        let reading: FuriToken[] | null = sentence.reading?.length ? sentence.reading : null;
        let readingError: string | null = null;
        if (!reading) {
          const generated = await generateFurigana(item.text);
          reading = generated.tokens;
          readingError = generated.error;
        }
        const sentenceAudio = sentence.audioFile ? await storeMediaFile(apkg, sentence.audioFile) : null;
        const image = imageTarget === "sentence" || imageTarget === "both" ? await resolveImage() : null;
        const [row] = await db.insert(sentences).values({
          text: item.text,
          translation: item.meaning ?? sentence.meaning ?? null,
          reading,
          readingError,
          language: input.language,
          tags: tagsFor(item, sentence),
          audioKey: sentenceAudio?.key ?? null,
          audioMime: sentenceAudio?.mime ?? null,
          imageKey: image?.key ?? null,
          imageMime: image?.mime ?? null,
        }).returning({
          id: sentences.id,
        });
        sentenceId = row.id;
        sentencesCreated += 1;
        existing.sentenceTexts.add(text);
        existingIds.sentenceIds.set(text, sentenceId);
      }

      if (wantLink && vocabId && sentenceId) {
        await db.insert(sentenceVocab).values({
          sentenceId,
          vocabId,
        }).onConflictDoNothing();
        linksCreated += 1;
      }
    }
  }

  return {
    sentencesCreated,
    vocabCreated,
    linksCreated,
    skipped,
  };
}

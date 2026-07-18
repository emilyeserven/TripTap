/**
 * Parser for the Migaku "Sentence" note type — the 9-field model every Migaku export uses
 * (`Word · Sentence · Translated Sentence · Definitions · Example Sentences · Notes · Images ·
 * Sentence Audio · Word Audio`). Each note bundles a focus word and the sentence(s) that teach it, so
 * one note becomes a **Vocab** (from Word/Definitions/Notes/Word Audio) plus one-or-more linked
 * **Sentences** (from Sentence/Translated Sentence/Sentence Audio/Images). See {@link parseMigakuModelNote}.
 */

import type { FuriToken, MigakuNoteGroup } from "@sentence-bank/types";
import { newId } from "@/lib/id";
import { parseMigakuSyntax } from "@/services/migaku/syntax";
import type { StoredMigakuCandidate } from "@/services/migaku/types";

const SOUND_RE = /\[sound:([^\]]+)\]/;
const IMG_RE = /<img[^>]+src=["']?([^"'>\s]+)["']?[^>]*>/i;
/** A kana reading in (parens), full-width or half-width — how Definitions carries the word's reading. */
const READING_IN_PARENS = /[（(]\s*([ぁ-んァ-ヶーゝゞ・]+)\s*[）)]/;

/** Convert Anki field HTML to readable plain text: block tags → newlines, other tags dropped, entities decoded. */
function htmlToText(html: string): string {
  return html
    .replace(/\[sound:[^\]]*\]/g, "")
    .replace(/<img[^>]*>/gi, "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|li|tr)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

/** Pull the word's kana reading out of the Definitions field's `（かな）`, or null. */
function readingFromDefinitions(definitions: string): string | null {
  const match = READING_IN_PARENS.exec(definitions);
  return match ? match[1] : null;
}

/**
 * The word's gloss from Definitions, dropping the redundant leading `Word （reading） ★` header line so
 * only the definition lines remain. Null when nothing useful is left.
 */
function meaningFromDefinitions(definitions: string, reading: string | null): string | null {
  const text = htmlToText(definitions);
  if (!text) return null;
  const lines = text.split("\n");
  // Drop a leading header line that is just the term + its parenthesized reading (+ frequency stars).
  if (reading && lines[0]?.includes(reading) && /[（(]/.test(lines[0])) lines.shift();
  const meaning = lines.join("\n").trim();
  return meaning || null;
}

/** First `[sound:...]` filename referenced in a single field, or null. */
function firstSound(field: string): string | null {
  return SOUND_RE.exec(field)?.[1] ?? null;
}

/** First `<img src=...>` filename referenced in a single field, or null. */
function firstImage(field: string): string | null {
  return IMG_RE.exec(field)?.[1] ?? null;
}

/**
 * Split the Example Sentences field into individual sentences. Empty in every sample deck we have, so
 * this is best-effort: block-level HTML and newlines are treated as separators. Callers should treat a
 * non-empty result as a bonus, not a guarantee.
 */
function splitExampleSentences(field: string): string[] {
  const text = htmlToText(field);
  if (!text) return [];
  return text.split("\n").map(s => s.trim()).filter(Boolean);
}

/** Build a sentence candidate from raw Migaku sentence markup (strips `<t>`, spacing, media). */
function sentenceCandidate(
  rawSentence: string,
  translation: string | null,
  audioFile: string | null,
  imageFile: string | null,
  tags: string,
  groupId: string,
): StoredMigakuCandidate | null {
  const {
    text, reading,
  } = parseMigakuSyntax(rawSentence);
  if (!text.trim()) return null;
  return {
    id: newId(),
    kind: "sentence",
    text,
    reading: reading as FuriToken[],
    meaning: translation,
    notes: null,
    tags,
    hasAudio: audioFile !== null,
    hasImage: imageFile !== null,
    audioFile,
    imageFile,
    groupId,
  };
}

export interface ParsedMigakuNote {
  candidates: StoredMigakuCandidate[];
  group: MigakuNoteGroup;
}

/**
 * Parse one Migaku "Sentence" note (fields keyed by lowercased name) into a focus vocab candidate and
 * its example sentence candidate(s), sharing a group so the commit step can link them. Returns null
 * when the note yields neither a usable word nor a usable sentence.
 *
 * `tags` is the already-assembled comma-separated tag string (shared with the generic path's logic).
 */
export function parseMigakuModelNote(
  fields: Map<string, string>,
  tags: string,
): ParsedMigakuNote | null {
  const groupId = newId();
  const get = (name: string) => (fields.get(name) ?? "").trim();

  const candidates: StoredMigakuCandidate[] = [];

  // ── Focus vocab (Word + Definitions + Notes + Word Audio) ──
  const word = htmlToText(get("word"));
  const definitions = get("definitions");
  const reading = readingFromDefinitions(definitions);
  let vocabId: string | null = null;
  if (word) {
    vocabId = newId();
    candidates.push({
      id: vocabId,
      kind: "vocab",
      text: word,
      reading: reading
        ? [{
          t: word,
          r: reading,
        }]
        : [],
      meaning: meaningFromDefinitions(definitions, reading),
      notes: htmlToText(get("notes")) || null,
      tags,
      hasAudio: firstSound(get("word audio")) !== null,
      hasImage: false,
      audioFile: firstSound(get("word audio")),
      imageFile: null,
      groupId,
    });
  }

  // ── Example sentence(s): the primary Sentence, then any extra Example Sentences ──
  const imageFile = firstImage(get("images"));
  const sentenceAudio = firstSound(get("sentence audio"));
  const sentenceIds: string[] = [];

  const primary = sentenceCandidate(
    get("sentence"),
    htmlToText(get("translated sentence")) || null,
    sentenceAudio,
    imageFile,
    tags,
    groupId,
  );
  if (primary) {
    candidates.push(primary);
    sentenceIds.push(primary.id);
  }

  for (const extra of splitExampleSentences(get("example sentences"))) {
    // Extra examples carry no own translation/media; they still link to the focus word.
    const cand = sentenceCandidate(extra, null, null, null, tags, groupId);
    if (cand) {
      candidates.push(cand);
      sentenceIds.push(cand.id);
    }
  }

  if (!vocabId && sentenceIds.length === 0) return null;

  return {
    candidates,
    group: {
      id: groupId,
      vocabId,
      sentenceIds,
      hasImage: imageFile !== null,
    },
  };
}

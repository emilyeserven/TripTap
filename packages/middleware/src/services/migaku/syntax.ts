/**
 * Parser for Migaku's inline ruby syntax, as it appears in an Anki `.apkg` Expression field.
 *
 * Migaku encodes a word as `Base[Reading(,DictionaryForm);pitch](okurigana outside the bracket)`, with
 * ASCII spaces inserted between words as parsing hints. Examples:
 *   `走[はし;k2]る`            → 走 reads はし, followed by plain り-less okurigana る
 *   `日本[にほん,にっぽん;h]`   → 日本 reads にほん (dictionary-form + pitch dropped)
 *   `私[わたし]は 日本[にほん]` → 私は日本 with ruby on 私 and 日本
 *
 * We keep only the base text and the primary reading; the dictionary-form (after `,`) and pitch-accent
 * (after `;`) components have no home in the schema and are dropped. Inter-word ASCII spaces — a Migaku
 * artifact — are removed so the reconstructed text reads as natural Japanese.
 */

import type { FuriToken } from "@sentence-bank/types";

/** Strip Anki/Migaku field markup that isn't part of the sentence: media refs, HTML tags, entities. */
function stripMarkup(raw: string): string {
  return raw
    // Anki media references live in dedicated fields, but strip any that bled into the text field.
    .replace(/\[sound:[^\]]*\]/g, "")
    .replace(/<img[^>]*>/gi, "")
    // Convert explicit line breaks to nothing (single-line sentences) and drop other tags.
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/** Reading before the first `,` (dictionary form) or `;` (pitch accent); trimmed, or null when empty. */
function primaryReading(bracket: string): string | null {
  const reading = bracket.split(/[,;]/)[0]?.trim() ?? "";
  return reading.length > 0 ? reading : null;
}

/** Append a plain (ruby-less) run to the token list, merging with a trailing plain token. */
function pushPlain(tokens: FuriToken[], text: string): void {
  if (!text) return;
  const last = tokens[tokens.length - 1];
  if (last && last.r === null) last.t += text;
  else tokens.push({
    t: text,
    r: null,
  });
}

/**
 * Parse a Migaku Expression field into plain `text` plus a furigana segmentation.
 *
 * `reading` is empty when the field carried no bracket readings — the caller then falls back to
 * generating furigana with kuroshiro.
 */
export function parseMigakuSyntax(raw: string): { text: string;
  reading: FuriToken[]; } {
  const source = stripMarkup(raw);
  const tokens: FuriToken[] = [];
  let base = "";
  let sawReading = false;

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "[") {
      const end = source.indexOf("]", i);
      if (end === -1) {
        // Unterminated bracket → treat the rest as plain text.
        base += source.slice(i);
        break;
      }
      const reading = primaryReading(source.slice(i + 1, end));
      if (reading && base) {
        tokens.push({
          t: base,
          r: reading,
        });
        sawReading = true;
        base = "";
      }
      else {
        // Bracket with no usable reading (or nothing to attach to) → keep base as plain text.
        pushPlain(tokens, base);
        base = "";
      }
      i = end;
    }
    else if (ch === " " || ch === "\t") {
      // Migaku's inter-word spacing hint — flush the current word and drop the space.
      pushPlain(tokens, base);
      base = "";
    }
    else {
      base += ch;
    }
  }
  pushPlain(tokens, base);

  return {
    text: tokens.map(t => t.t).join(""),
    reading: sawReading ? tokens : [],
  };
}

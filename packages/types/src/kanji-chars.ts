/**
 * Han-character detection, shared by the API and the client.
 *
 * This lives in `types` for the same reason `dialogue.ts` and `source-tree.ts` do: the middleware
 * derives the kanji index server-side and the client re-derives highlight positions while rendering,
 * so the two must agree on exactly what counts as a kanji.
 *
 * Two classes live here, and the difference is deliberate.
 *
 * {@link HAS_KANJI_RE} is the **furigana gate**: "does this text need ruby?" It was written out three
 * times in the client — `SentenceForm.tsx`, `FuriganaEditor.tsx`, and inline and unnamed in
 * `SentenceCardTools.tsx` — as `/[㐀-䶿一-鿿々]/`. That spelling is preserved character-for-character,
 * including the iteration mark 々, so moving those call sites here changes no behaviour.
 *
 * {@link isKanji} is the **index predicate**: "is this a character the learner has met?" It excludes
 * 々, because in 時々 the repeated character is 時 — counting 々 would invent a kanji nobody learns.
 * It also spans compatibility and supplementary-plane ideographs that the gate's ranges miss, which
 * is safe for counting but would have been a behaviour change for the gate.
 *
 * The other CJK classes in the repo are wider still and stay where they are: `CJK_CLASS` in the
 * client's `cleanedBlocks.ts` spans kana, Hangul and punctuation (it segments text by script), and
 * `JAPANESE` in `services/ocr/util.ts` matches kana (it tags an OCR block Japanese vs. English).
 */

/**
 * Matches text that should offer furigana — ideographs plus the iteration mark 々.
 *
 * Kept exactly as the three client call sites spelled it. Note this is a *different* class from
 * {@link isKanji}: see the module comment. Not `\p{Script=Han}` — widening it would start offering
 * furigana on text those call sites currently skip.
 */
export const HAS_KANJI_RE = /[㐀-䶿一-鿿々]/;

/** Whether `text` contains anything worth generating furigana for. */
export function hasKanji(text: string): boolean {
  return HAS_KANJI_RE.test(text);
}

/**
 * Matches a single character with Unicode `Script=Han`.
 *
 * `\p{Script=Han}` rather than hand-written ranges: it covers the Unified Ideographs block, Extension
 * A, the Compatibility Ideographs, and the supplementary-plane extensions in one expression, and the
 * `u` flag makes it match a full astral code point instead of half a surrogate pair — which matters
 * because rare kanji really do appear above U+FFFF.
 */
const HAN = /\p{Script=Han}/u;

/**
 * The Han-script characters that are marks rather than kanji, all in CJK Symbols and Punctuation.
 *
 * `Script=Han` is broader than "a character you learn": U+3005 々 (iteration), U+3006 〆 (closing),
 * U+3007 〇 (ideographic zero) and U+3021–U+303B (Hangzhou numerals, 〻) all carry it. Indexing them
 * would invent kanji — in 時々 the repeated character is 時, and crediting 々 as its own character
 * puts a mark nobody studies in the grid. Excluding the block is exact: every kanji proper sits
 * above U+3400.
 */
const HAN_MARKS = /[々-〻]/u;

/** Whether a single character (one code point) is a kanji proper — Han, but not an ideographic mark. */
export function isKanji(ch: string): boolean {
  return HAN.test(ch) && !HAN_MARKS.test(ch);
}

/**
 * Every kanji in `text`, in order, **including repeats** — so callers can count occurrences.
 *
 * Iterating the string with `for…of` walks code points, not UTF-16 units, so a supplementary-plane
 * kanji is yielded as one character rather than two broken halves.
 */
export function extractKanji(text: string): string[] {
  const out: string[] = [];
  for (const ch of text) {
    if (isKanji(ch)) out.push(ch);
  }
  return out;
}

/** The distinct kanji in `text`, in first-appearance order. */
export function uniqueKanji(text: string): string[] {
  return [...new Set(extractKanji(text))];
}

/** How many times `char` occurs in `text`. Assumes `char` is a single code point. */
export function countKanji(text: string, char: string): number {
  let n = 0;
  for (const ch of text) {
    if (ch === char) n += 1;
  }
  return n;
}

/**
 * Normalize Japanese orthography toward the common written form. Renshuu's example sentences are stored
 * over-kanjified — words that are conventionally written in kana appear in rare/archaic kanji (e.g.
 * `此の辺り` for `この辺り`, `密集為る` for `密集する`). Furigana generation also misreads some of these
 * (kuromoji has no reading for `此` and reads `為る` as なる, not する), so we rewrite a curated set of
 * these "usually kana" forms to kana *before* rendering or generating furigana.
 *
 * This is deliberately conservative: only unambiguous multi-character sequences and clearly
 * grammatical forms are listed, so a real compound (`行為`, `様子`, `事件`) is never mangled. It is not
 * exhaustive — extend {@link USUALLY_KANA} as new offenders surface.
 */

/**
 * Kanji spellings → their conventional kana, for words normally written in kana. Applied longest-first
 * as plain substring replacement, so entries must be unambiguous (never a substring of a legit word
 * that should keep its kanji).
 */
const USUALLY_KANA: Record<string, string> = {
  // Demonstratives / interrogatives
  此の: "この",
  其の: "その",
  彼の: "あの",
  此れ: "これ",
  其れ: "それ",
  此処: "ここ",
  其処: "そこ",
  彼処: "あそこ",
  何処: "どこ",
  何故: "なぜ",
  // する / ある / いる / できる and common conjugations
  為ない: "しない",
  為ます: "します",
  為よう: "しよう",
  為れば: "すれば",
  為た: "した",
  為て: "して",
  為る: "する",
  為に: "ために",
  出来る: "できる",
  出来ます: "できます",
  出来た: "できた",
  出来ない: "できない",
  有る: "ある",
  有ります: "あります",
  無い: "ない",
  無く: "なく",
  居る: "いる",
  居ます: "います",
  貰う: "もらう",
  呉れる: "くれる",
  下さい: "ください",
  // Adverbs / conjunctions
  沢山: "たくさん",
  丁度: "ちょうど",
  殆ど: "ほとんど",
  一寸: "ちょっと",
  是非: "ぜひ",
  屹度: "きっと",
  若し: "もし",
  兎に角: "とにかく",
  迚も: "とても",
  段々: "だんだん",
  益々: "ますます",
  態々: "わざわざ",
  折角: "せっかく",
  尤も: "もっとも",
  直ぐ: "すぐ",
  更に: "さらに",
  既に: "すでに",
  迄: "まで",
  程: "ほど",
  位: "くらい",
};

/** Entries sorted longest-key-first so a longer match wins over a shorter overlapping one. */
const ENTRIES = Object.entries(USUALLY_KANA).sort((a, b) => b[0].length - a[0].length);

/**
 * Rewrite the conventionally-kana words in `text` from their rare kanji spellings to kana. Leaves all
 * other kanji untouched. Idempotent.
 */
export function normalizeJapaneseOrthography(text: string): string {
  let out = text;
  for (const [kanji, kana] of ENTRIES) {
    if (out.includes(kanji)) out = out.split(kanji).join(kana);
  }
  return out;
}

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countKanji,
  extractKanji,
  hasKanji,
  isKanji,
  uniqueKanji,
} from "@sentence-bank/types";

// The character helpers are pure functions shared by the API and the client, so they need no
// database and no Fastify — these exercise them directly.

test("extractKanji keeps only Han characters", () => {
  assert.deepEqual(extractKanji("日本語を勉強します"), ["日", "本", "語", "勉", "強"]);
});

test("extractKanji ignores kana, punctuation, latin and full-width digits", () => {
  assert.deepEqual(extractKanji("ひらがなカタカナ"), []);
  assert.deepEqual(extractKanji("「こんにちは。」ABC１２３"), []);
});

test("extractKanji keeps repeats so occurrences can be counted", () => {
  assert.deepEqual(extractKanji("人人人"), ["人", "人", "人"]);
  assert.deepEqual(uniqueKanji("人人人"), ["人"]);
});

test("uniqueKanji preserves first-appearance order", () => {
  assert.deepEqual(uniqueKanji("後日、日本へ"), ["後", "日", "本"]);
});

test("the iteration mark 々 is not indexed as a character of its own", () => {
  // 時々 teaches 時; crediting 々 would invent a kanji nobody learns. Note 々 does carry
  // Unicode Script=Han, so this only holds because the ideographic marks are excluded explicitly.
  assert.deepEqual(extractKanji("時々"), ["時"]);
  assert.equal(isKanji("々"), false);
  // …but it still counts as "this text wants furigana", which is a different question.
  assert.equal(hasKanji("人々"), true);
});

test("the other Han-script marks are excluded too", () => {
  // 〆 (closing), 〇 (ideographic zero) and 〻 are all Script=Han but are not kanji to learn.
  assert.equal(isKanji("〆"), false);
  assert.equal(isKanji("〇"), false);
  assert.equal(isKanji("〻"), false);
  assert.deepEqual(extractKanji("〆切"), ["切"]);
});

test("a supplementary-plane ideograph yields one character, not two surrogate halves", () => {
  // U+20B9F 𠮟 (the "scold" variant) is outside the BMP, so a UTF-16 index loop would split it.
  const astral = "\u{20B9F}";
  assert.equal(astral.length, 2, "fixture should be a surrogate pair");
  assert.deepEqual(extractKanji(`${astral}る`), [astral]);
  assert.equal(isKanji(astral), true);
});

test("countKanji counts every occurrence in a string", () => {
  assert.equal(countKanji("日曜日に日記", "日"), 3);
  assert.equal(countKanji("日曜日に日記", "記"), 1);
  assert.equal(countKanji("ひらがな", "日"), 0);
});

test("hasKanji matches the furigana gate, not the index predicate", () => {
  assert.equal(hasKanji("ひらがなだけ"), false);
  assert.equal(hasKanji("漢字"), true);
});

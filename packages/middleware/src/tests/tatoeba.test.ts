import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTranscription, pickReading, toExampleSentence } from "@/services/tatoeba";

describe("toExampleSentence", () => {
  it("prefers a direct English translation", () => {
    const result = toExampleSentence({
      id: 1,
      text: "猫は魚を食べる。",
      license: "CC BY 2.0 FR",
      user: {
        username: "someone",
      },
      // api_v0 nests as [direct[], indirect[]]; the direct group wins.
      translations: [
        [{
          text: "The cat eats fish.",
          lang: "eng",
        }],
        [{
          text: "The cat eats fish (pivoted).",
          lang: "eng",
        }],
      ],
    });
    assert.deepEqual(result, {
      id: 1,
      text: "猫は魚を食べる。",
      reading: null,
      translation: "The cat eats fish.",
      license: "CC BY 2.0 FR",
      owner: "someone",
    });
  });

  it("falls back to an indirect English translation when the direct group has none", () => {
    const result = toExampleSentence({
      id: 2,
      text: "毎朝パンを食べます。",
      license: "CC0 1.0",
      user: null,
      translations: [
        [],
        [{
          text: "I eat bread every morning.",
          lang: "eng",
        }],
      ],
    });
    assert.equal(result?.translation, "I eat bread every morning.");
    assert.equal(result?.owner, null);
  });

  it("returns a null translation when there is no English pair", () => {
    const result = toExampleSentence({
      id: 3,
      text: "テスト。",
      license: "CC BY 2.0 FR",
      translations: [
        [{
          text: "Test.",
          lang: "fra",
        }],
      ],
    });
    assert.equal(result?.translation, null);
  });

  it("drops an item missing id or text", () => {
    assert.equal(toExampleSentence({
      text: "no id",
    }), null);
    assert.equal(toExampleSentence({
      id: 4,
      text: "   ",
    }), null);
  });

  it("defaults the license when absent", () => {
    const result = toExampleSentence({
      id: 5,
      text: "本。",
      translations: [],
    });
    assert.equal(result?.license, "CC BY 2.0 FR");
  });

  it("parses furigana from the Japanese transcription", () => {
    const result = toExampleSentence({
      id: 6,
      text: "犬が好きです。",
      transcriptions: [{
        script: "Hrkt",
        text: "[犬|いぬ]が[好|す]きです。",
      }],
    });
    assert.deepEqual(result?.reading, [
      {
        t: "犬",
        r: "いぬ",
      },
      {
        t: "が",
        r: null,
      },
      {
        t: "好",
        r: "す",
      },
      {
        t: "きです。",
        r: null,
      },
    ]);
  });
});

describe("parseTranscription", () => {
  it("groups a multi-kanji compound under one reading", () => {
    // api_v0 splits a compound's reading per-kanji inside one bracket.
    assert.deepEqual(parseTranscription("[勉強|べん|きょう]します"), [
      {
        t: "勉強",
        r: "べんきょう",
      },
      {
        t: "します",
        r: null,
      },
    ]);
  });

  it("splits separately-bracketed adjacent kanji", () => {
    assert.deepEqual(parseTranscription("[一|いっ][緒|しょ]"), [
      {
        t: "一",
        r: "いっ",
      },
      {
        t: "緒",
        r: "しょ",
      },
    ]);
  });

  it("keeps unbracketed kanji as plain text", () => {
    assert.deepEqual(parseTranscription("本を[読|よ]む"), [
      {
        t: "本を",
        r: null,
      },
      {
        t: "読",
        r: "よ",
      },
      {
        t: "む",
        r: null,
      },
    ]);
  });
});

describe("pickReading", () => {
  it("prefers the Hrkt transcription", () => {
    const reading = pickReading([
      {
        script: "Latn",
        text: "inu ga suki desu.",
      },
      {
        script: "Hrkt",
        text: "[犬|いぬ]が",
      },
    ]);
    assert.deepEqual(reading, [
      {
        t: "犬",
        r: "いぬ",
      },
      {
        t: "が",
        r: null,
      },
    ]);
  });

  it("returns null when no transcription carries bracket furigana", () => {
    assert.equal(pickReading([{
      script: "Latn",
      text: "inu ga suki desu.",
    }]), null);
    assert.equal(pickReading([]), null);
    assert.equal(pickReading(undefined), null);
  });
});

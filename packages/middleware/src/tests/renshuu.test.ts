import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toExampleSentence } from "@/services/renshuu";
import { normalizeJapaneseOrthography } from "@/services/renshuu/orthography";

describe("renshuu toExampleSentence", () => {
  it("maps a reibun to the wire shape (reading filled in later by search)", () => {
    const result = toExampleSentence({
      id: 93381,
      japanese: "人間、犬、魚、鳥は皆動物である。",
      hiragana: "にんげん、いぬ、さかな、とりはみなどうぶつである。",
      meaning: {
        en: "Men, dogs, fish, and birds are all animals.",
      },
    });
    assert.deepEqual(result, {
      id: 93381,
      text: "人間、犬、魚、鳥は皆動物である。",
      reading: null,
      translation: "Men, dogs, fish, and birds are all animals.",
    });
  });

  it("normalizes over-kanjified text toward the common written form", () => {
    const result = toExampleSentence({
      id: 15219,
      japanese: "此の辺りは若者が密集為ることが多い。",
      meaning: {
        en: "There is a dense population of young people around here.",
      },
    });
    assert.equal(result?.text, "この辺りは若者が密集することが多い。");
  });

  it("nulls the translation when meaning is missing or has no English", () => {
    assert.equal(toExampleSentence({
      id: 1,
      japanese: "犬。",
      meaning: null,
    })?.translation, null);
    assert.equal(toExampleSentence({
      id: 2,
      japanese: "猫。",
      meaning: {},
    })?.translation, null);
  });

  it("drops a reibun missing an id or text", () => {
    assert.equal(toExampleSentence({
      japanese: "no id",
    }), null);
    assert.equal(toExampleSentence({
      id: 3,
      japanese: "   ",
    }), null);
  });
});

describe("normalizeJapaneseOrthography", () => {
  it("rewrites conventionally-kana words from rare kanji", () => {
    assert.equal(normalizeJapaneseOrthography("此れは兎に角沢山有ると思う。"), "これはとにかくたくさんあると思う。");
    assert.equal(normalizeJapaneseOrthography("此の辺りで勉強為る。"), "この辺りで勉強する。");
  });

  it("leaves real compounds and ordinary kanji untouched", () => {
    // 行為 / 事件 / 様子 contain 為/事/様 but must not be mangled.
    assert.equal(normalizeJapaneseOrthography("彼の行為は事件の様子を変えた。"), "あの行為は事件の様子を変えた。");
    assert.equal(normalizeJapaneseOrthography("日本語を勉強する。"), "日本語を勉強する。");
  });

  it("is idempotent", () => {
    const once = normalizeJapaneseOrthography("此の辺りは密集為る。");
    assert.equal(normalizeJapaneseOrthography(once), once);
  });
});

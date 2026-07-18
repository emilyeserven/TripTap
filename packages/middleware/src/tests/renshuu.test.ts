import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toExampleSentence } from "@/services/renshuu";

describe("renshuu toExampleSentence", () => {
  it("maps a full reibun to the wire shape", () => {
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
      reading: "にんげん、いぬ、さかな、とりはみなどうぶつである。",
      translation: "Men, dogs, fish, and birds are all animals.",
    });
  });

  it("nulls a blank reading and a missing meaning", () => {
    const result = toExampleSentence({
      id: 1,
      japanese: "犬。",
      hiragana: "   ",
      meaning: null,
    });
    assert.equal(result?.reading, null);
    assert.equal(result?.translation, null);
  });

  it("nulls the translation when meaning has no English", () => {
    const result = toExampleSentence({
      id: 2,
      japanese: "猫。",
      meaning: {},
    });
    assert.equal(result?.translation, null);
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

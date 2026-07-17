import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toExampleSentence } from "@/services/tatoeba";

describe("toExampleSentence", () => {
  it("prefers a direct English translation", () => {
    const result = toExampleSentence({
      id: 1,
      text: "猫は魚を食べる。",
      license: "CC BY 2.0 FR",
      owner: "someone",
      translations: [
        {
          text: "The cat eats fish (pivoted).",
          lang: "eng",
          is_direct: false,
        },
        {
          text: "The cat eats fish.",
          lang: "eng",
          is_direct: true,
        },
      ],
    });
    assert.deepEqual(result, {
      id: 1,
      text: "猫は魚を食べる。",
      translation: "The cat eats fish.",
      license: "CC BY 2.0 FR",
      owner: "someone",
    });
  });

  it("falls back to any English translation when none are direct", () => {
    const result = toExampleSentence({
      id: 2,
      text: "毎朝パンを食べます。",
      license: "CC0 1.0",
      owner: null,
      translations: [{
        text: "I eat bread every morning.",
        lang: "eng",
        is_direct: false,
      }],
    });
    assert.equal(result?.translation, "I eat bread every morning.");
    assert.equal(result?.owner, null);
  });

  it("returns a null translation when there is no English pair", () => {
    const result = toExampleSentence({
      id: 3,
      text: "テスト。",
      license: "CC BY 2.0 FR",
      translations: [{
        text: "Test.",
        lang: "fra",
        is_direct: true,
      }],
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
});

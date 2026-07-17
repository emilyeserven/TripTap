import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deckNamesFromTags, deckTag, hasDeckTag } from "@sentence-bank/types";
import { deckNameFromFilename } from "@/services/migaku/deck";

describe("deckNameFromFilename", () => {
  it("strips the .apkg extension", () => {
    assert.equal(deckNameFromFilename("Japanese N5.apkg"), "Japanese N5");
  });

  it("strips a .zip extension case-insensitively", () => {
    assert.equal(deckNameFromFilename("Core2k.ZIP"), "Core2k");
  });

  it("falls back to a placeholder for an empty name", () => {
    assert.equal(deckNameFromFilename(".apkg"), "Imported deck");
  });
});

describe("deck tag helpers", () => {
  it("builds a prefixed tag and strips commas from the name", () => {
    assert.equal(deckTag("Japanese N5"), "deck:Japanese N5");
    assert.equal(deckTag("a, b"), "deck:a  b");
  });

  it("extracts deck names from a mixed tag string", () => {
    assert.deepEqual(deckNamesFromTags("migaku, deck:Japanese N5, n5"), ["Japanese N5"]);
  });

  it("returns no deck names when there are none", () => {
    assert.deepEqual(deckNamesFromTags("migaku, n5"), []);
    assert.deepEqual(deckNamesFromTags(null), []);
  });

  it("matches a deck tag regardless of surrounding tags", () => {
    assert.equal(hasDeckTag("migaku, deck:Japanese N5", "Japanese N5"), true);
    assert.equal(hasDeckTag("migaku, deck:Japanese N5", "Core2k"), false);
    assert.equal(hasDeckTag(null, "Japanese N5"), false);
  });
});

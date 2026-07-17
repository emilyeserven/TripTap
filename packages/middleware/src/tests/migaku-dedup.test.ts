import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { candidateExists, type ExistingBankKeys } from "@/services/migaku/dedup";

const keys: ExistingBankKeys = {
  sentenceTexts: new Set(["日本が好きです。"]),
  vocabTerms: new Set(["猫"]),
};

describe("candidateExists", () => {
  it("matches an existing sentence by text", () => {
    assert.equal(candidateExists("sentence", "日本が好きです。", keys), true);
  });

  it("matches an existing vocab term", () => {
    assert.equal(candidateExists("vocab", "猫", keys), true);
  });

  it("ignores surrounding whitespace", () => {
    assert.equal(candidateExists("vocab", "  猫  ", keys), true);
  });

  it("does not cross kinds (a known vocab term is not a known sentence)", () => {
    assert.equal(candidateExists("sentence", "猫", keys), false);
  });

  it("returns false for an unseen candidate", () => {
    assert.equal(candidateExists("sentence", "新しい文", keys), false);
  });
});

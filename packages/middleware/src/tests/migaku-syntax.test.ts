import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseMigakuSyntax } from "@/services/migaku/syntax";

describe("parseMigakuSyntax", () => {
  it("attaches a bracket reading to its base as ruby", () => {
    const {
      text, reading,
    } = parseMigakuSyntax("日本[にほん]");
    assert.equal(text, "日本");
    assert.deepEqual(reading, [{
      t: "日本",
      r: "にほん",
    }]);
  });

  it("drops the dictionary-form and pitch-accent components of a reading", () => {
    const {
      text, reading,
    } = parseMigakuSyntax("日本[にほん,にっぽん;h]");
    assert.equal(text, "日本");
    assert.deepEqual(reading, [{
      t: "日本",
      r: "にほん",
    }]);
  });

  it("keeps okurigana outside the bracket as a plain run", () => {
    const {
      text, reading,
    } = parseMigakuSyntax("走[はし;k2]る");
    assert.equal(text, "走る");
    assert.deepEqual(reading, [
      {
        t: "走",
        r: "はし",
      },
      {
        t: "る",
        r: null,
      },
    ]);
  });

  it("removes Migaku inter-word spacing and merges plain runs", () => {
    const {
      text, reading,
    } = parseMigakuSyntax("私[わたし]は 日本[にほん]が 好[す]き");
    assert.equal(text, "私は日本が好き");
    assert.deepEqual(reading, [
      {
        t: "私",
        r: "わたし",
      },
      {
        t: "は",
        r: null,
      },
      {
        t: "日本",
        r: "にほん",
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
        t: "き",
        r: null,
      },
    ]);
  });

  it("returns an empty reading when the field has no bracket readings", () => {
    const {
      text, reading,
    } = parseMigakuSyntax("これはペンです。");
    assert.equal(text, "これはペンです。");
    assert.deepEqual(reading, []);
  });

  it("strips sound refs, img tags, and HTML markup", () => {
    const {
      text,
    } = parseMigakuSyntax("<div>猫[ねこ]<br>[sound:cat.mp3]</div>");
    assert.equal(text, "猫");
  });

  it("treats an unterminated bracket as literal text", () => {
    const {
      text, reading,
    } = parseMigakuSyntax("あれ[");
    assert.equal(text, "あれ[");
    assert.deepEqual(reading, []);
  });
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { applyOverrides } from "@/services/furigana";

// Unit tests for the vocab-override merge (pure; no analyzer/dictionary needed).

test("applyOverrides returns tokens unchanged when there are no overrides", () => {
  const tokens = [{
    t: "毎朝",
    r: "まいあさ",
  }, {
    t: "を",
    r: null,
  }];
  assert.deepEqual(applyOverrides(tokens, new Map()), tokens);
});

test("applyOverrides replaces a single token's reading", () => {
  const tokens = [{
    t: "毎朝",
    r: "まいあさ",
  }, {
    t: "を",
    r: null,
  }];
  const out = applyOverrides(tokens, new Map([["毎朝", "マイあさ"]]));
  assert.deepEqual(out, [{
    t: "毎朝",
    r: "マイあさ",
  }, {
    t: "を",
    r: null,
  }]);
});

test("applyOverrides merges consecutive tokens into a name (split by the analyzer)", () => {
  const tokens = [{
    t: "陽",
    r: "よう",
  }, {
    t: "菜",
    r: "な",
  }, {
    t: "が",
    r: null,
  }];
  const out = applyOverrides(tokens, new Map([["陽菜", "ひな"]]));
  assert.deepEqual(out, [{
    t: "陽菜",
    r: "ひな",
  }, {
    t: "が",
    r: null,
  }]);
});

test("applyOverrides prefers the longest matching term", () => {
  const tokens = [{
    t: "日本",
    r: "にほん",
  }, {
    t: "語",
    r: "ご",
  }];
  const out = applyOverrides(tokens, new Map([["日本", "X"], ["日本語", "にっぽんご"]]));
  assert.deepEqual(out, [{
    t: "日本語",
    r: "にっぽんご",
  }]);
});

test("applyOverrides only matches at token boundaries (no substring pollution)", () => {
  const tokens = [{
    t: "今日",
    r: "きょう",
  }];
  const out = applyOverrides(tokens, new Map([["日", "ひ"]]));
  assert.deepEqual(out, [{
    t: "今日",
    r: "きょう",
  }]);
});

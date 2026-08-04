import assert from "node:assert/strict";
import { test } from "node:test";
import type { DialogueLine } from "@sentence-bank/types";
import {
  dialogueLineCounts,
  dialogueSpeakers,
  isSelfSpeaker,
  parseDialogueScript,
  reconcileDialogueLines,
} from "@sentence-bank/types";

// The dialogue parser is a pure function shared by the API and the client, so it needs no database
// and no Fastify — these exercise it directly.

const SAMPLE = [
  "田中さん：こんにちは、元気ですか？",
  "私：はい、元気です。田中さん、元気ですか？",
  "田中さん：はい、元気です。中村さん、元気ですか？",
  "中村さん：はい。",
].join("\n");

/** Stand in for `crypto.randomUUID()` so reconciled ids are predictable in assertions. */
function counter(): () => string {
  let n = 0;
  return () => `new-${++n}`;
}

function line(overrides: Partial<DialogueLine> & { id: string }): DialogueLine {
  return {
    speaker: null,
    text: "",
    reading: null,
    readingError: null,
    translation: null,
    ...overrides,
  };
}

test("parses a three-speaker script on full-width colons", () => {
  const lines = parseDialogueScript(SAMPLE);
  assert.equal(lines.length, 4);
  assert.deepEqual(lines[0], {
    speaker: "田中さん",
    text: "こんにちは、元気ですか？",
  });
  assert.deepEqual(dialogueSpeakers(lines), ["田中さん", "私", "中村さん"]);
  assert.deepEqual(dialogueLineCounts(lines), {
    田中さん: 2,
    私: 1,
    中村さん: 1,
  });
});

test("accepts ASCII colons, and both kinds within one script", () => {
  const lines = parseDialogueScript("Tanaka: Hello\n私：はい\nNakamura:Hi");
  assert.deepEqual(lines.map(l => l.speaker), ["Tanaka", "私", "Nakamura"]);
  assert.deepEqual(lines.map(l => l.text), ["Hello", "はい", "Hi"]);
});

test("splits on the first separator only, so a time in the line survives", () => {
  const [first] = parseDialogueScript("私：10:30に行きます");
  assert.equal(first.speaker, "私");
  assert.equal(first.text, "10:30に行きます");
});

test("a bare line containing a colon does not invent a speaker", () => {
  const lines = parseDialogueScript("10:30に行きます");
  assert.equal(lines.length, 1);
  assert.equal(lines[0].speaker, null);
  assert.equal(lines[0].text, "10:30に行きます");
});

test("a line with no speaker continues the one above it", () => {
  const lines = parseDialogueScript("田中さん：こんにちは。\n元気ですか？\n私：はい。");
  assert.equal(lines.length, 2);
  assert.deepEqual(lines[0], {
    speaker: "田中さん",
    text: "こんにちは。 元気ですか？",
  });
  assert.equal(lines[1].speaker, "私");
});

test("a run that ends a sentence is text, not a speaker label", () => {
  const [first] = parseDialogueScript("そうですね。それで：どうしますか");
  assert.equal(first.speaker, null);
});

test("blank lines are dropped and labels are trimmed", () => {
  const lines = parseDialogueScript("\n  田中さん ： こんにちは  \n\n");
  assert.equal(lines.length, 1);
  assert.deepEqual(lines[0], {
    speaker: "田中さん",
    text: "こんにちは",
  });
});

test("私 and Me are the learner; other speakers are not", () => {
  assert.equal(isSelfSpeaker("私"), true);
  assert.equal(isSelfSpeaker("Me"), true);
  assert.equal(isSelfSpeaker("me"), true);
  assert.equal(isSelfSpeaker(" ME "), true);
  assert.equal(isSelfSpeaker("田中さん"), false);
  assert.equal(isSelfSpeaker(null), false);
});

test("a dialogue's own selfSpeakers extend the built-in list", () => {
  assert.equal(isSelfSpeaker("エミリー", ["エミリー"]), true);
  assert.equal(isSelfSpeaker("emily", ["Emily"]), true);
  assert.equal(isSelfSpeaker("中村さん", ["エミリー"]), false);
});

test("reconcile keeps ids, readings, and translations for unchanged lines", () => {
  const previous = [
    line({
      id: "a",
      speaker: "田中さん",
      text: "こんにちは",
      translation: "Hello",
      reading: [{
        t: "こんにちは",
        r: null,
      }],
    }),
    line({
      id: "b",
      speaker: "私",
      text: "はい",
      translation: "Yes",
    }),
  ];
  const next = reconcileDialogueLines("田中さん：こんにちは\n私：はい", previous, counter());
  assert.deepEqual(next.map(l => l.id), ["a", "b"]);
  assert.deepEqual(next.map(l => l.translation), ["Hello", "Yes"]);
  assert.deepEqual(next[0].reading, [{
    t: "こんにちは",
    r: null,
  }]);
});

test("reconcile follows a line that shifted position, and flags the new one", () => {
  const previous = [
    line({
      id: "a",
      speaker: "田中さん",
      text: "こんにちは",
      translation: "Hello",
    }),
  ];
  const next = reconcileDialogueLines(
    "中村さん：はじめまして\n田中さん：こんにちは",
    previous,
    counter(),
  );
  assert.deepEqual(next.map(l => l.id), ["new-1", "a"]);
  assert.equal(next[0].translation, null);
  // A new line comes back with no reading, which is the API's signal to generate furigana for it.
  assert.equal(next[0].reading, null);
  assert.equal(next[1].translation, "Hello");
});

test("reconcile gives each copy of a repeated line its own carried translation", () => {
  const previous = [
    line({
      id: "a",
      speaker: "私",
      text: "はい",
      translation: "Yes",
    }),
    line({
      id: "b",
      speaker: "私",
      text: "はい",
      translation: "Yeah",
    }),
  ];
  const next = reconcileDialogueLines("私：はい\n私：はい", previous, counter());
  assert.deepEqual(next.map(l => l.id), ["a", "b"]);
  assert.deepEqual(next.map(l => l.translation), ["Yes", "Yeah"]);
});

test("reconcile drops a translation whose line is gone", () => {
  const previous = [
    line({
      id: "a",
      speaker: "私",
      text: "はい",
      translation: "Yes",
    }),
  ];
  const next = reconcileDialogueLines("私：いいえ", previous, counter());
  assert.equal(next.length, 1);
  assert.equal(next[0].id, "new-1");
  assert.equal(next[0].translation, null);
});

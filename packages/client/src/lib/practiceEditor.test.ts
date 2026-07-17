// @vitest-environment node
import type { PracticeSentence } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import { NONE, toDraft, toInput } from "./practiceEditor";

function practiceSentence(over: Partial<PracticeSentence>): PracticeSentence {
  return {
    id: "ps-1",
    text: "頭が痛い",
    reading: null,
    translation: null,
    language: "Japanese",
    target: null,
    targetKind: null,
    comprehension: null,
    guess: null,
    literal: null,
    register: null,
    nuance: null,
    words: null,
    grammar: null,
    terms: null,
    passes: null,
    sourceId: null,
    page: null,
    captureId: null,
    sentenceId: null,
    needsCorrection: true,
    createdAt: "2026-01-01T00:00:00Z",
    ...over,
  } as PracticeSentence;
}

describe("toDraft", () => {
  it("maps nulls to editable empties and seeds one blank word/grammar row", () => {
    const draft = toDraft(practiceSentence({}));
    expect(draft.reading).toBe("");
    expect(draft.register).toBe(NONE);
    expect(draft.targetKind).toBe("word");
    expect(draft.words).toEqual([{
      w: "",
      r: "",
      m: "",
    }]);
    expect(draft.grammar).toEqual([{
      p: "",
      n: "",
    }]);
  });

  it("keeps existing rows instead of seeding blanks", () => {
    const draft = toDraft(practiceSentence({
      words: [{
        w: "頭",
        r: "あたま",
        m: "head",
      }],
    }));
    expect(draft.words).toHaveLength(1);
    expect(draft.words[0].w).toBe("頭");
  });
});

describe("toInput", () => {
  it("drops empty rows, nulls empty strings, and maps the NONE register to null", () => {
    const input = toInput(toDraft(practiceSentence({})));
    expect(input.words).toBeNull();
    expect(input.grammar).toBeNull();
    expect(input.terms).toBeNull();
    expect(input.reading).toBeNull();
    expect(input.register).toBeNull();
    expect(input.targetKind).toBeNull();
  });

  it("keeps targetKind only when a target is set and preserves filled rows", () => {
    const draft = toDraft(practiceSentence({}));
    draft.target = "頭が痛い";
    draft.targetKind = "idiom";
    draft.words = [{
      w: "頭",
      r: "",
      m: "",
    }, {
      w: "",
      r: "",
      m: "",
    }];
    const input = toInput(draft);
    expect(input.targetKind).toBe("idiom");
    expect(input.words).toEqual([{
      w: "頭",
      r: "",
      m: "",
    }]);
  });

  it("round-trips a fully-filled sentence", () => {
    const ps = practiceSentence({
      reading: "あたまがいたい",
      translation: "My head hurts",
      register: "slang",
      target: "頭が痛い",
      targetKind: "idiom",
      comprehension: "ready",
    });
    const input = toInput(toDraft(ps));
    expect(input.reading).toBe("あたまがいたい");
    expect(input.translation).toBe("My head hurts");
    expect(input.register).toBe("slang");
    expect(input.comprehension).toBe("ready");
  });
});

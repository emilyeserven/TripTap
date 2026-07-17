// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { SharedCaptureValues } from "./captureParseInputs";

import { buildSentenceInputs, buildVocabInputs, parseForMode, pick } from "./captureParseInputs";

const shared: SharedCaptureValues = {
  captureId: "cap-1",
  sourceId: "src-1",
  page: "12",
  language: "Japanese",
  tags: "n5",
  notes: "",
};

describe("pick", () => {
  it("prefers the per-item value, then the shared value, then empty", () => {
    expect(pick("item", "shared")).toBe("item");
    expect(pick("  ", "shared")).toBe("shared");
    expect(pick(undefined, " shared ")).toBe("shared");
    expect(pick(undefined, "  ")).toBe("");
  });
});

describe("parseForMode", () => {
  it("parses only the active section in single-target modes", () => {
    const sentence = parseForMode({
      mode: "sentence",
      workingText: "猫がいる\nThere is a cat",
      divider: "---",
      sentenceTemplate: "{{text}}\n{{translation}}",
      vocabTemplate: "{{term}}\t{{meaning}}",
      boundary: "fixed",
      ignoreBlankLines: true,
    });
    expect(sentence.sentence?.validCount).toBe(1);
    expect(sentence.vocab).toBeUndefined();
  });

  it("splits merged mode on the divider into sentence and vocab sections", () => {
    const merged = parseForMode({
      mode: "merged",
      workingText: "猫がいる\nThere is a cat\n---\n猫\tcat",
      divider: "---",
      sentenceTemplate: "{{text}}\n{{translation}}",
      vocabTemplate: "{{term}}\t{{meaning}}",
      boundary: "fixed",
      ignoreBlankLines: true,
    });
    expect(merged.sentence?.validCount).toBe(1);
    expect(merged.vocab?.validCount).toBe(1);
    expect(merged.vocab?.items[0].fields.term).toBe("猫");
  });
});

describe("buildSentenceInputs", () => {
  it("keeps only valid items, applies shared fallbacks, and attaches links", () => {
    const result = parseForMode({
      mode: "sentence",
      workingText: "猫がいる\nThere is a cat\n\n\n",
      divider: "---",
      sentenceTemplate: "{{text}}\n{{translation}}",
      vocabTemplate: "{{term}}\t{{meaning}}",
      boundary: "blank",
      ignoreBlankLines: false,
    }).sentence!;
    const inputs = buildSentenceInputs(result, shared, (i, text) => (text.includes("猫") ? ["v-1"] : []));
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toMatchObject({
      text: "猫がいる",
      translation: "There is a cat",
      language: "Japanese",
      sourceId: "src-1",
      page: "12",
      tags: "n5",
      notes: null,
      captureId: "cap-1",
      vocabIds: ["v-1"],
    });
  });
});

describe("buildVocabInputs", () => {
  it("maps valid vocab rows with shared fallbacks", () => {
    const result = parseForMode({
      mode: "vocab",
      workingText: "猫\tcat",
      divider: "---",
      sentenceTemplate: "{{text}}",
      vocabTemplate: "{{term}}\t{{meaning}}",
      boundary: "fixed",
      ignoreBlankLines: true,
    }).vocab!;
    const inputs = buildVocabInputs(result, shared);
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toMatchObject({
      term: "猫",
      meaning: "cat",
      reading: null,
      language: "Japanese",
      captureId: "cap-1",
    });
  });
});

import { describe, expect, it } from "vitest";

import { parseTemplate, splitOnDivider } from "./parseTemplate";

describe("splitOnDivider", () => {
  it("splits on the first line equal to the divider and drops that line", () => {
    const text = "毎朝コーヒーを飲みます。\nI drink coffee every morning.\n---\n毎朝\tevery morning\nコーヒー\tcoffee";
    const [sentences, vocab] = splitOnDivider(text, "---");
    expect(sentences).toBe("毎朝コーヒーを飲みます。\nI drink coffee every morning.");
    expect(vocab).toBe("毎朝\tevery morning\nコーヒー\tcoffee");
  });

  it("matches the divider ignoring surrounding whitespace", () => {
    const [sentences, vocab] = splitOnDivider("a\n  ---  \nb", "---");
    expect(sentences).toBe("a");
    expect(vocab).toBe("b");
  });

  it("returns the whole text as the first section when the divider is absent", () => {
    const [sentences, vocab] = splitOnDivider("a\nb", "---");
    expect(sentences).toBe("a\nb");
    expect(vocab).toBe("");
  });

  it("returns the whole text as the first section when the divider is blank", () => {
    const [sentences, vocab] = splitOnDivider("a\nb", "  ");
    expect(sentences).toBe("a\nb");
    expect(vocab).toBe("");
  });
});

describe("parseTemplate", () => {
  it("fixed mode: every 2 lines is one item ({{text}} / {{translation}})", () => {
    const text = "毎朝コーヒーを飲みます。\nI drink coffee every morning.\n犬が好きです。\nI like dogs.";
    const result = parseTemplate(text, "{{text}}\n{{translation}}", {
      boundary: "fixed",
      ignoreBlankLines: true,
      requiredField: "text",
    });
    expect(result.items).toHaveLength(2);
    expect(result.items[0].fields).toEqual({
      text: "毎朝コーヒーを飲みます。",
      translation: "I drink coffee every morning.",
    });
    expect(result.items[1].fields.translation).toBe("I like dogs.");
    expect(result.invalidCount).toBe(0);
  });

  it("single-line with a tab delimiter ({{term}}\\t{{meaning}})", () => {
    const text = "毎朝\tevery morning\n犬\tdog";
    const result = parseTemplate(text, "{{term}}\t{{meaning}}", {
      boundary: "fixed",
      ignoreBlankLines: true,
      requiredField: "term",
    });
    expect(result.items).toHaveLength(2);
    expect(result.items[0].fields).toEqual({
      term: "毎朝",
      meaning: "every morning",
    });
    expect(result.items[1].fields).toEqual({
      term: "犬",
      meaning: "dog",
    });
  });

  it("blank-line mode: one item per paragraph block", () => {
    const text = "line A\nline B\n\nline C\nline D";
    const result = parseTemplate(text, "{{text}}\n{{translation}}", {
      boundary: "blank",
      ignoreBlankLines: true,
      requiredField: "text",
    });
    expect(result.items).toHaveLength(2);
    expect(result.items[0].fields).toEqual({
      text: "line A",
      translation: "line B",
    });
    expect(result.items[1].fields.text).toBe("line C");
  });

  it("flags items whose required field is empty", () => {
    // A trailing single line has no translation but is still text — valid; an empty term is invalid.
    const text = "term1 = meaning1\n = meaning2";
    const result = parseTemplate(text, "{{term}} = {{meaning}}", {
      boundary: "fixed",
      ignoreBlankLines: true,
      requiredField: "term",
    });
    expect(result.items).toHaveLength(2);
    expect(result.items[0].valid).toBe(true);
    expect(result.items[1].valid).toBe(false);
    expect(result.invalidCount).toBe(1);
  });

  it("greedy last field keeps delimiters that appear in the value", () => {
    const text = "犬\ta dog, the animal";
    const result = parseTemplate(text, "{{term}}\t{{meaning}}", {
      boundary: "fixed",
      ignoreBlankLines: true,
      requiredField: "term",
    });
    expect(result.items[0].fields.meaning).toBe("a dog, the animal");
  });
});

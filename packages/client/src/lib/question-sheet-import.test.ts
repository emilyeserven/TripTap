import { describe, expect, it } from "vitest";

import {
  buildQuestionSheetImportPrompt,
  importedGridRows,
  importedLayout,
  importedQuestions,
  parseQuestionSheetImport,
} from "./question-sheet-import";

describe("buildQuestionSheetImportPrompt", () => {
  it("mentions the resource and page when given", () => {
    const prompt = buildQuestionSheetImportPrompt({
      resource: "Genki I Workbook",
      page: "p. 12",
    });
    expect(prompt).toContain("\"Genki I Workbook\"");
    expect(prompt).toContain("p. 12");
    expect(prompt).toContain("\"questions\"");
  });
});

describe("parseQuestionSheetImport", () => {
  it("accepts fenced JSON and converts it to form questions with fresh ids", () => {
    const result = parseQuestionSheetImport(`\`\`\`json
{
  "title": "Genki — L3",
  "questions": [
    { "prompt": "Fill in.", "parts": [{ "label": "(a)", "text": " 東京＿＿行きます。 ", "parts": [{ "label": "(i)" }] }] },
    { "prompt": "T or F", "answerType": "boolean" },
    { "answerType": "choice", "choices": ["A", "B"] }
  ]
}
\`\`\``);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(importedLayout(result.data)).toBe("list");
    const questions = importedQuestions(result.data);
    expect(questions).toHaveLength(3);
    expect(questions[0].parts?.[0]).toMatchObject({
      label: "(a)",
      text: "東京＿＿行きます。",
      parts: [{
        label: "(i)",
      }],
    });
    expect(questions[0].parts?.[0].parts?.[0].text).toBeUndefined();
    expect(questions[1]).toMatchObject({
      prompt: "T or F",
      answerType: "boolean",
    });
    expect(questions[2]).toMatchObject({
      prompt: "",
      answerType: "choice",
      choices: ["A", "B"],
    });
    expect(new Set(questions.map(q => q.id)).size).toBe(3);
  });

  it("infers a grid layout and builds rows", () => {
    const result = parseQuestionSheetImport(
      "{\"grid\":{\"columns\":[\"te-form\"],\"rows\":[\"食べる\",\"飲む\"]}}",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(importedLayout(result.data)).toBe("grid");
    expect(importedGridRows(result.data).map(r => r.label)).toEqual(["食べる", "飲む"]);
  });

  it("reports invalid JSON and schema errors", () => {
    const bad = parseQuestionSheetImport("{nope");
    expect(bad.ok).toBe(false);
    const wrong = parseQuestionSheetImport("{\"questions\":[{\"parts\":[{\"text\":\"no label\"}]}]}");
    expect(wrong.ok).toBe(false);
    if (wrong.ok) return;
    expect(wrong.errors[0]).toContain("questions.0.parts.0.label");
  });
});

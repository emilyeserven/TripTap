import type { AnswerSheet, AnswerSheetEntry, QuestionSheet } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import { formatAnswerSheetForTeacher } from "./answer-sheet-share";

function entry(slotId: string, value: string): AnswerSheetEntry {
  return {
    slotId,
    value,
    correct: null,
    correction: null,
    reasoning: null,
    intendedMeaning: null,
    actualMeaning: null,
    marks: null,
  };
}

const listSheet: QuestionSheet = {
  id: "qs1",
  title: "Genki I — L3",
  notes: null,
  page: "p. 12",
  bookmarkId: null,
  bookmarkTitle: null,
  bookmarkUrl: null,
  sections: [],
  dueDate: null,
  firstQuestionNumber: 3,
  learningAreas: [],
  grammarTerms: [],
  dailyQuestionEnabled: false,
  layout: "list",
  questions: [{
    id: "q1",
    prompt: "Fill in the blank.",
    parts: [{
      id: "p1",
      label: "(a)",
      text: "東京＿＿行きます。",
    }, {
      id: "p2",
      label: "(b)",
      text: "私＿＿学生です。",
    }],
  }, {
    id: "q2",
    prompt: "週末に何をしましたか。",
  }, {
    id: "q3",
    prompt: "C",
  }],
  grid: null,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};

const answers: AnswerSheet = {
  id: "as1",
  questionSheetId: "qs1",
  title: null,
  date: null,
  entries: [entry("p1", "に"), entry("q2", "映画を見ました。")],
  hiddenPartIds: null,
  createdAt: "2026-11-02T00:00:00.000Z",
  updatedAt: "2026-11-02T00:00:00.000Z",
};

describe("formatAnswerSheetForTeacher", () => {
  it("lists answered questions with their text and numbering", () => {
    expect(formatAnswerSheetForTeacher(listSheet, answers, {
      includeQuestions: true,
      includeUnanswered: false,
    })).toBe([
      "Genki I — L3 (p. 12)",
      "",
      "3. Fill in the blank.",
      "   (a) 東京＿＿行きます。",
      "       → に",
      "",
      "4. 週末に何をしましたか。",
      "   → 映画を見ました。",
    ].join("\n"));
  });

  it("can show gaps and drop the question text", () => {
    expect(formatAnswerSheetForTeacher(listSheet, answers, {
      includeQuestions: false,
      includeUnanswered: true,
    })).toBe([
      "Genki I — L3 (p. 12)",
      "",
      "3.",
      "   (a)",
      "       → に",
      "   (b)",
      "       → —",
      "",
      "4.",
      "   → 映画を見ました。",
      "",
      "C.",
      "   → —",
    ].join("\n"));
  });

  it("skips hidden parts", () => {
    const text = formatAnswerSheetForTeacher(listSheet, {
      ...answers,
      hiddenPartIds: ["q1"],
    }, {
      includeQuestions: true,
      includeUnanswered: true,
    });
    expect(text).not.toContain("東京");
    expect(text).toContain("週末");
  });

  it("formats a grid row by row", () => {
    const grid: QuestionSheet = {
      ...listSheet,
      page: null,
      layout: "grid",
      questions: [],
      grid: {
        columns: ["te-form", "past"],
        rows: [{
          id: "r1",
          label: "食べる",
        }],
      },
    };
    expect(formatAnswerSheetForTeacher(grid, {
      ...answers,
      entries: [entry("r1:0", "食べて")],
    }, {
      includeQuestions: true,
      includeUnanswered: false,
    })).toBe("Genki I — L3\n\n食べる\n   te-form: 食べて");
  });
});

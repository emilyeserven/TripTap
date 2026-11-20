import type { AnswerSheet, AnswerSheetEntry, QuestionSheet } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import {
  dailyQuestionQueue,
  dailyQuestionSlots,
  entriesWithAnswer,
  isLabelOnlyPrompt,
  workingAnswerSheet,
} from "./daily-question";

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

function sheet(overrides: Partial<QuestionSheet> = {}): QuestionSheet {
  return {
    id: "qs1",
    title: "Genki I — L3",
    notes: null,
    page: "p. 12",
    bookmarkId: null,
    bookmarkTitle: null,
    bookmarkUrl: null,
    sections: [],
    dueDate: null,
    firstQuestionNumber: 1,
    learningAreas: [],
    grammarTerms: [],
    dailyQuestionEnabled: true,
    layout: "list",
    questions: [{
      id: "q1",
      prompt: "Fill in the blank with the correct particle.",
      parts: [
        {
          id: "p1",
          label: "(a)",
          text: "東京＿＿行きます。",
        },
        {
          id: "p2",
          label: "(b)",
        },
        {
          id: "p3",
          label: "(c)",
          text: "Pick one:",
          parts: [{
            id: "p3i",
            label: "(i)",
            text: "私＿＿学生です。",
          }],
        },
      ],
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
    ...overrides,
  };
}

function attempt(overrides: Partial<AnswerSheet> = {}): AnswerSheet {
  return {
    id: "as1",
    questionSheetId: "qs1",
    title: null,
    date: null,
    entries: [],
    hiddenPartIds: null,
    createdAt: "2026-11-02T00:00:00.000Z",
    updatedAt: "2026-11-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("isLabelOnlyPrompt", () => {
  it.each(["", "A", "3", "(ii)", "iv.", "①", "Question 4", "（2）"])("treats %j as a label", (p) => {
    expect(isLabelOnlyPrompt(p)).toBe(true);
  });
  it.each(["週末に何をしましたか。", "Fill in the blanks", "Translate: I went home."])(
    "treats %j as a question",
    (p) => {
      expect(isLabelOnlyPrompt(p)).toBe(false);
    },
  );
});

describe("dailyQuestionSlots", () => {
  it("carries the question and heading parts as context, and flags label-only slots", () => {
    const slots = dailyQuestionSlots(sheet());
    expect(slots.map(s => [s.slotId, s.selfContained])).toEqual([
      ["p1", true],
      ["p2", false],
      ["p3i", true],
      ["q2", true],
      ["q3", false],
    ]);
    expect(slots[2]).toMatchObject({
      label: "(i)",
      text: "私＿＿学生です。",
      context: [
        {
          label: "Question 1",
          text: "Fill in the blank with the correct particle.",
        },
        {
          label: "(c)",
          text: "Pick one:",
        },
      ],
    });
    // A parts-less question's prompt is the question itself.
    expect(slots[3]).toMatchObject({
      label: "Question 2",
      text: "週末に何をしましたか。",
      context: [],
    });
  });

  it("uses grid cell ids matching the answer sheet", () => {
    const slots = dailyQuestionSlots(sheet({
      layout: "grid",
      questions: [],
      grid: {
        columns: ["te-form", "past"],
        rows: [{
          id: "r1",
          label: "食べる",
        }],
      },
    }));
    expect(slots.map(s => [s.slotId, s.label, s.text])).toEqual([
      ["r1:0", "食べる", "te-form"],
      ["r1:1", "食べる", "past"],
    ]);
  });
});

describe("workingAnswerSheet", () => {
  it("is null with no attempts and the latest attempt otherwise", () => {
    const qs = sheet();
    expect(workingAnswerSheet(qs, [])).toBeNull();
    const older = attempt({
      id: "old",
      updatedAt: "2026-11-02T00:00:00.000Z",
    });
    const newer = attempt({
      id: "new",
      updatedAt: "2026-11-05T00:00:00.000Z",
    });
    expect(workingAnswerSheet(qs, [older, newer])?.id).toBe("new");
  });

  it("is undefined once any attempt is complete", () => {
    const qs = sheet();
    const done = attempt({
      entries: ["p1", "p2", "p3i", "q2", "q3"].map(id => entry(id, "x")),
    });
    expect(workingAnswerSheet(qs, [done])).toBeUndefined();
  });
});

describe("dailyQuestionQueue", () => {
  it("serves unanswered self-contained slots, skipping answered and hidden ones", () => {
    const qs = sheet();
    const as = attempt({
      entries: [entry("p1", "に")],
    });
    expect(dailyQuestionQueue([qs], [as]).map(q => q.slotId)).toEqual(["p3i", "q2"]);
    const hidden = attempt({
      hiddenPartIds: ["q1"],
    });
    expect(dailyQuestionQueue([qs], [hidden]).map(q => q.slotId)).toEqual(["q2"]);
  });

  it("only serves sheets marked OK for the daily question", () => {
    const ok = sheet({
      id: "ok",
    });
    const notOk = sheet({
      id: "not-ok",
      dailyQuestionEnabled: false,
      dueDate: "2026-11-20T00:00:00.000Z",
    });
    const order = dailyQuestionQueue([notOk, ok], []).map(q => q.sheet.id);
    expect([...new Set(order)]).toEqual(["ok"]);
    expect(dailyQuestionQueue([notOk], [])).toEqual([]);
  });

  it("orders sheets by due date, then in-progress, then oldest", () => {
    const undated = sheet({
      id: "undated",
      createdAt: "2026-10-01T00:00:00.000Z",
    });
    const dueLater = sheet({
      id: "later",
      dueDate: "2026-12-01T00:00:00.000Z",
    });
    const dueSoon = sheet({
      id: "soon",
      dueDate: "2026-11-20T00:00:00.000Z",
    });
    const startedUndated = sheet({
      id: "started",
      createdAt: "2026-11-10T00:00:00.000Z",
    });
    const started = attempt({
      questionSheetId: "started",
      entries: [entry("p1", "に")],
    });
    const order = dailyQuestionQueue([undated, dueLater, dueSoon, startedUndated], [started])
      .map(q => q.sheet.id);
    expect([...new Set(order)]).toEqual(["soon", "later", "started", "undated"]);
  });
});

describe("entriesWithAnswer", () => {
  it("adds or replaces the slot's answer in sheet order, keeping review fields", () => {
    const qs = sheet();
    const existing = [{
      ...entry("q2", "old"),
      correct: false,
    }, entry("p3i", "は")];
    const next = entriesWithAnswer(qs, existing, "p1", "に");
    expect(next.map(e => [e.slotId, e.value])).toEqual([
      ["p1", "に"],
      ["p3i", "は"],
      ["q2", "old"],
    ]);
    const replaced = entriesWithAnswer(qs, existing, "q2", "new");
    expect(replaced.find(e => e.slotId === "q2")).toMatchObject({
      value: "new",
      correct: false,
    });
  });
});

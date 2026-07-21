import type { DrillMistake, DrillSession } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import {
  flaggedRecurringQuestions,
  normalizeQuestion,
  recurringQuestions,
} from "./drill-recurring";

const NOW = new Date("2026-07-20T12:00:00Z");

function mistake(question: string | null, over: Partial<DrillMistake> = {}): DrillMistake {
  return {
    id: `m-${Math.round(Math.random() * 1e9)}`,
    question,
    prompt: "wrong answer",
    reasons: [],
    ...over,
  };
}

function session(id: string, date: string, questions: (string | null)[]): DrillSession {
  return {
    id,
    date,
    title: null,
    notes: null,
    mistakes: questions.map(q => mistake(q)),
    questions: 0,
    learningArea: null,
    createdAt: `${date}T00:00:00Z`,
    updatedAt: `${date}T00:00:00Z`,
  };
}

describe("normalizeQuestion", () => {
  it("trims, collapses whitespace, and case-folds; empty → null", () => {
    expect(normalizeQuestion("  Te  form  ")).toBe("te form");
    expect(normalizeQuestion("")).toBeNull();
    expect(normalizeQuestion("   ")).toBeNull();
    expect(normalizeQuestion(null)).toBeNull();
  });
});

describe("recurringQuestions / flaggedRecurringQuestions", () => {
  it("flags a question in 3+ distinct sessions within the last 7 days", () => {
    const sessions = [
      session("s1", "2026-07-20", ["て form", "particle に"]),
      session("s2", "2026-07-18", ["て form"]),
      session("s3", "2026-07-15", ["て　form"]), // different spacing → same key
      session("s4", "2026-07-19", ["particle に"]),
    ];
    const flagged = flaggedRecurringQuestions(sessions, NOW);
    // The two spellings ("て form" and "て　form") collapse to one key across 3 distinct sessions.
    const te = flagged.find(f => normalizeQuestion(f.question) === "て form");
    expect(te?.sessionCount).toBe(3);
    // "particle に" appears in only 2 sessions → not flagged.
    expect(flagged.some(f => normalizeQuestion(f.question) === "particle に")).toBe(false);
  });

  it("counts a question once per session even if repeated within it", () => {
    const sessions = [
      session("s1", "2026-07-20", ["dup", "dup"]),
      session("s2", "2026-07-19", ["dup"]),
      session("s3", "2026-07-18", ["dup"]),
    ];
    const map = recurringQuestions(sessions, NOW);
    expect(map.get("dup")?.sessionCount).toBe(3);
  });

  it("ignores sessions outside the 7-day window", () => {
    const sessions = [
      session("s1", "2026-07-20", ["old"]),
      session("s2", "2026-07-19", ["old"]),
      session("s3", "2026-07-01", ["old"]), // >7 days ago → excluded
    ];
    expect(flaggedRecurringQuestions(sessions, NOW)).toHaveLength(0);
  });

  it("skips mistakes without a question", () => {
    const sessions = [
      session("s1", "2026-07-20", [null]),
      session("s2", "2026-07-19", [null]),
      session("s3", "2026-07-18", [null]),
    ];
    expect(recurringQuestions(sessions, NOW).size).toBe(0);
  });

  it("uses the most recent occurrence as the sample", () => {
    const sessions = [
      session("s-old", "2026-07-15", ["q"]),
      session("s-new", "2026-07-20", ["q"]),
      session("s-mid", "2026-07-17", ["q"]),
    ];
    const rec = recurringQuestions(sessions, NOW).get("q");
    expect(rec?.sample).toBe(sessions[1].mistakes?.[0]);
  });
});

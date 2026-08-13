import type { Writing } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import { formatWritingDate, writingLabel } from "@/lib/writing-label";

function writing(over: Partial<Writing>): Pick<Writing, "title" | "date"> {
  return {
    title: null,
    date: "2026-08-13",
    ...over,
  };
}

describe("formatWritingDate", () => {
  it("formats a calendar day as its own day, not the viewer's zone", () => {
    // Parsed as UTC midnight — a local-zone format would render Aug 12 anywhere west of UTC.
    expect(formatWritingDate("2026-08-13")).toContain("13");
    expect(formatWritingDate("2026-08-13")).toContain("2026");
  });

  it("passes an unparseable date through untouched", () => {
    expect(formatWritingDate("not a date")).toBe("not a date");
  });
});

describe("writingLabel", () => {
  it("uses the learner's title when there is one", () => {
    expect(writingLabel(writing({
      title: "夏休みの計画",
    }))).toBe("夏休みの計画");
  });

  it("falls back to the day written when untitled", () => {
    expect(writingLabel(writing({}))).toBe(formatWritingDate("2026-08-13"));
  });

  it("treats a whitespace-only title as untitled", () => {
    expect(writingLabel(writing({
      title: "   ",
    }))).toBe(formatWritingDate("2026-08-13"));
  });
});

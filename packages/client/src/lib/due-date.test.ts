// @vitest-environment node
import { describe, expect, it } from "vitest";

import { formatDueDate, isDueSoon, isOverdue, todayCalendarDayIso } from "./due-date";

const now = new Date("2026-07-01T12:00:00Z");

describe("isOverdue", () => {
  it("is true for a due date in the past", () => {
    expect(isOverdue("2026-06-30T12:00:00Z", now)).toBe(true);
  });

  it("is false for a due date in the future", () => {
    expect(isOverdue("2026-07-02T12:00:00Z", now)).toBe(false);
  });

  it("is false at the exact due instant", () => {
    expect(isOverdue("2026-07-01T12:00:00Z", now)).toBe(false);
  });
});

describe("isDueSoon", () => {
  it("is true for a date inside the horizon", () => {
    expect(isDueSoon("2026-07-03T12:00:00Z", now, 3)).toBe(true);
  });

  it("is true for a date exactly on the horizon boundary", () => {
    expect(isDueSoon("2026-07-04T12:00:00Z", now, 3)).toBe(true);
  });

  it("is false for a date beyond the horizon", () => {
    expect(isDueSoon("2026-07-05T12:00:00Z", now, 3)).toBe(false);
  });

  it("is true for an already-overdue date", () => {
    expect(isDueSoon("2026-06-01T00:00:00Z", now, 3)).toBe(true);
  });
});

describe("formatDueDate", () => {
  it("formats the stored UTC calendar day without shifting to the local zone", () => {
    // Midnight UTC on the 1st must read as the 1st everywhere — not "Jul 31" for viewers west of UTC.
    expect(formatDueDate("2026-08-01T00:00:00.000Z")).toBe("Aug 1, 2026");
  });
});

describe("todayCalendarDayIso", () => {
  it("is UTC midnight of the caller's local calendar day", () => {
    // Re-derives the expected day with the same local getters, so it holds in any runner timezone.
    const at = new Date("2026-08-10T12:00:00Z");
    const y = at.getFullYear();
    const m = String(at.getMonth() + 1).padStart(2, "0");
    const d = String(at.getDate()).padStart(2, "0");
    expect(todayCalendarDayIso(at)).toBe(`${y}-${m}-${d}T00:00:00.000Z`);
  });

  it("defaults so the badge shows the learner's local day, not the UTC day", () => {
    const at = new Date("2026-08-10T12:00:00Z");
    // A local Date at local midnight is the learner's calendar day; the defaulted+formatted date must
    // match it — the whole point of the fix, and true in any runner timezone.
    const localDay = new Date(at.getFullYear(), at.getMonth(), at.getDate());
    expect(formatDueDate(todayCalendarDayIso(at))).toBe(
      localDay.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    );
  });
});

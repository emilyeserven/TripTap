// @vitest-environment node
import { describe, expect, it } from "vitest";

import { isDueSoon, isOverdue } from "./due-date";

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

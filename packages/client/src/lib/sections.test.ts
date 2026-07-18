import type { BookmarkSectionRef } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import { sectionRefStartMs, sectionRefToSegment } from "./sections";

function ref(over: Partial<BookmarkSectionRef>): BookmarkSectionRef {
  return {
    id: "s1",
    label: "Part 2",
    type: "timestamp",
    startValue: "1:00",
    endValue: "2:00",
    ...over,
  };
}

describe("sectionRefToSegment", () => {
  it("converts a timestamp section into a segment", () => {
    const seg = sectionRefToSegment(ref({}));
    expect(seg).toMatchObject({
      label: "Part 2",
      startMs: 60_000,
      endMs: 120_000,
      maxReplays: null,
      gapMs: null,
    });
    expect(seg?.id).toBeTruthy();
  });

  it("returns null for a non-timestamp section", () => {
    expect(sectionRefToSegment(ref({
      type: "page",
      startValue: "12",
      endValue: null,
    }))).toBeNull();
  });

  it("returns null when the start or end can't be parsed", () => {
    expect(sectionRefToSegment(ref({
      startValue: null,
    }))).toBeNull();
    expect(sectionRefToSegment(ref({
      endValue: "",
    }))).toBeNull();
  });
});

describe("sectionRefStartMs", () => {
  it("returns the parsed start ms for a timestamp section", () => {
    expect(sectionRefStartMs(ref({
      startValue: "0:30",
    }))).toBe(30_000);
  });

  it("returns null for null, non-timestamp, or unparseable sections", () => {
    expect(sectionRefStartMs(null)).toBeNull();
    expect(sectionRefStartMs(ref({
      type: "name",
    }))).toBeNull();
    expect(sectionRefStartMs(ref({
      startValue: null,
    }))).toBeNull();
  });
});

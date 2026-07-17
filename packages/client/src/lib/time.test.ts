// @vitest-environment node
import { describe, expect, it } from "vitest";

import { formatTime, parseSectionTime, parseYouTubeId } from "./time";

describe("formatTime", () => {
  it("formats zero as 00:00:00.000", () => {
    expect(formatTime(0)).toBe("00:00:00.000");
  });

  it("formats hours, minutes, seconds, and milliseconds with padding", () => {
    expect(formatTime(3_723_456)).toBe("01:02:03.456");
  });

  it("clamps negative durations to zero", () => {
    expect(formatTime(-500)).toBe("00:00:00.000");
  });

  it("floors fractional milliseconds", () => {
    expect(formatTime(999.9)).toBe("00:00:00.999");
  });
});

describe("parseSectionTime", () => {
  it("parses MM:SS to milliseconds", () => {
    expect(parseSectionTime("01:30")).toBe(90_000);
  });

  it("parses HH:MM:SS.mmm to milliseconds", () => {
    expect(parseSectionTime("1:02:03.5")).toBe(3_723_500);
  });

  it("parses a bare number as seconds", () => {
    expect(parseSectionTime("90")).toBe(90_000);
    expect(parseSectionTime("1.5")).toBe(1500);
  });

  it("trims surrounding whitespace", () => {
    expect(parseSectionTime("  45  ")).toBe(45_000);
  });

  it("returns null for empty or non-numeric input", () => {
    expect(parseSectionTime("")).toBeNull();
    expect(parseSectionTime("   ")).toBeNull();
    expect(parseSectionTime("abc")).toBeNull();
    expect(parseSectionTime("1:xx")).toBeNull();
  });

  it("returns null for negative components or too many colon parts", () => {
    expect(parseSectionTime("-5")).toBeNull();
    expect(parseSectionTime("1:-2")).toBeNull();
    expect(parseSectionTime("1:2:3:4")).toBeNull();
  });
});

describe("parseYouTubeId", () => {
  it("accepts a bare 11-character id", () => {
    expect(parseYouTubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts the id from watch, youtu.be, embed, and shorts URLs", () => {
    expect(parseYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeId("https://m.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for other hosts, malformed ids, and empty input", () => {
    expect(parseYouTubeId("https://vimeo.com/12345")).toBeNull();
    expect(parseYouTubeId("https://youtu.be/short")).toBeNull();
    expect(parseYouTubeId("not a url")).toBeNull();
    expect(parseYouTubeId("")).toBeNull();
    expect(parseYouTubeId(null)).toBeNull();
    expect(parseYouTubeId(undefined)).toBeNull();
  });
});

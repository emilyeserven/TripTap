import { describe, expect, it } from "vitest";

import { matches, sortLevels } from "./search";

describe("matches", () => {
  it("matches any field case-insensitively", () => {
    expect(matches("inn", "宿", "yado", "inn, lodging")).toBe(true);
    expect(matches("INN", "宿", null, "inn")).toBe(true);
  });
  it("returns true for an empty query", () => {
    expect(matches("  ", "anything")).toBe(true);
  });
  it("returns false when nothing matches", () => {
    expect(matches("zzz", "宿", "yado", "inn")).toBe(false);
  });
});

describe("sortLevels", () => {
  it("orders JLPT levels N5→N1, then other tags alphabetically, deduped", () => {
    expect(sortLevels(["N1", "travel", "N5", "N5", "local", "N3"]))
      .toEqual(["N5", "N3", "N1", "local", "travel"]);
  });
});

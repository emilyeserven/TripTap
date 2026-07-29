import { describe, expect, it } from "vitest";

import { diffChars } from "./simple-diff";

describe("diffChars", () => {
  it("marks identical strings entirely as same", () => {
    expect(diffChars("電気が消える", "電気が消える")).toEqual([
      {
        value: "電気が消える",
        type: "same",
      },
    ]);
  });

  it("marks a changed character as removed (in a) then added (in b)", () => {
    // 消し → 消え: shared 消, then し removed, え added.
    const segs = diffChars("電気が消しました", "電気が消えました");
    const reconstructedA = segs.filter(s => s.type !== "added").map(s => s.value).join("");
    const reconstructedB = segs.filter(s => s.type !== "removed").map(s => s.value).join("");
    expect(reconstructedA).toBe("電気が消しました");
    expect(reconstructedB).toBe("電気が消えました");
    expect(segs.some(s => s.type === "removed" && s.value.includes("し"))).toBe(true);
    expect(segs.some(s => s.type === "added" && s.value.includes("え"))).toBe(true);
  });

  it("handles an empty attempt as all added", () => {
    expect(diffChars("", "犬")).toEqual([{
      value: "犬",
      type: "added",
    }]);
  });
});

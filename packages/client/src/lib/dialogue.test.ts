import { describe, expect, it } from "vitest";

import { speakerAccent, speakerInitial } from "./dialogue";

describe("speakerAccent", () => {
  it("gives the same speaker the same colour every time", () => {
    expect(speakerAccent("田中さん")).toBe(speakerAccent("田中さん"));
  });

  it("distinguishes the speakers of a typical scene", () => {
    const accents = ["田中さん", "中村さん", "山田さん"].map(speakerAccent);
    expect(new Set(accents).size).toBe(3);
  });

  it("falls back to a neutral colour for an unattributed line", () => {
    expect(speakerAccent(null)).toBe("bg-muted text-muted-foreground");
  });
});

describe("speakerInitial", () => {
  it("takes the first character of a name", () => {
    expect(speakerInitial("田中さん")).toBe("田");
    expect(speakerInitial("  Tanaka ")).toBe("T");
  });

  it("takes a whole code point, not half a surrogate pair", () => {
    expect(speakerInitial("🐈さん")).toBe("🐈");
  });

  it("has a placeholder for an unattributed line", () => {
    expect(speakerInitial(null)).toBe("•");
    expect(speakerInitial("   ")).toBe("•");
  });
});

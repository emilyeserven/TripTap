import type { ConstructionSlot, GrammarConstruction } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import {
  alternativeDisplay,
  derivePattern,
  hasBlocks,
  meaningSegments,
} from "./construction-blocks";

const slot = (id: string, alternatives: ConstructionSlot["alternatives"]): ConstructionSlot => ({
  id,
  alternatives,
});

const alt = (
  id: string,
  label: string,
  forms: string[] = [],
  extra: Partial<ConstructionSlot["alternatives"][number]> = {},
) => ({
  id,
  label,
  forms,
  ...extra,
});

/** The user's canonical example: Adj(Short)/Verb(Short) + Noun. */
const exampleSlots: ConstructionSlot[] = [
  slot("s1", [alt("a1", "Adj", ["Short"]), alt("a2", "Verb", ["Short"])]),
  slot("s2", [alt("a3", "Noun")]),
];

describe("hasBlocks", () => {
  const base: GrammarConstruction = {
    id: "c1",
    pattern: "〜ないといけない",
    note: null,
    sentenceIds: [],
  };

  it("is false for a flat construction", () => {
    expect(hasBlocks(base)).toBe(false);
  });

  it("is false for empty slots", () => {
    expect(hasBlocks({
      ...base,
      slots: [],
    })).toBe(false);
  });

  it("is true when slots exist", () => {
    expect(hasBlocks({
      ...base,
      slots: exampleSlots,
    })).toBe(true);
  });
});

describe("alternativeDisplay", () => {
  it("appends forms in parens", () => {
    expect(alternativeDisplay(alt("a", "Adj", ["Short"]))).toBe("Adj(Short)");
  });

  it("joins multiple forms with a comma", () => {
    expect(alternativeDisplay(alt("a", "Adj", ["Short", "Polite"]))).toBe("Adj(Short, Polite)");
  });

  it("renders a form-less alternative bare", () => {
    expect(alternativeDisplay(alt("a", "Noun"))).toBe("Noun");
  });

  it("renders a literal bare even with forms", () => {
    expect(alternativeDisplay(alt("a", "の", ["Short"], {
      literal: true,
    }))).toBe("の");
  });

  it("is empty for an empty label", () => {
    expect(alternativeDisplay(alt("a", "  ", ["Short"]))).toBe("");
  });
});

describe("derivePattern", () => {
  it("derives the canonical example", () => {
    expect(derivePattern(exampleSlots)).toBe("Adj(Short)/Verb(Short) + Noun");
  });

  it("is empty for no slots", () => {
    expect(derivePattern([])).toBe("");
  });

  it("skips slots whose alternatives are all empty", () => {
    expect(derivePattern([
      slot("s1", [alt("a1", "")]),
      slot("s2", [alt("a2", "Noun")]),
    ])).toBe("Noun");
  });

  it("renders literals bare between slots", () => {
    expect(derivePattern([
      slot("s1", [alt("a1", "Noun")]),
      slot("s2", [alt("a2", "の", [], {
        literal: true,
      })]),
      slot("s3", [alt("a3", "Noun")]),
    ])).toBe("Noun + の + Noun");
  });
});

describe("meaningSegments", () => {
  it("resolves placeholders against slots", () => {
    expect(meaningSegments("A [Noun] who is [Adj/Verb]", exampleSlots)).toEqual([
      {
        type: "text",
        text: "A ",
      },
      {
        type: "slot",
        slotId: "s2",
        placeholder: "Noun",
      },
      {
        type: "text",
        text: " who is ",
      },
      {
        type: "slot",
        slotId: "s1",
        placeholder: "Adj/Verb",
      },
    ]);
  });

  it("matches a single alternative's label", () => {
    expect(meaningSegments("is [Verb]", exampleSlots)).toEqual([
      {
        type: "text",
        text: "is ",
      },
      {
        type: "slot",
        slotId: "s1",
        placeholder: "Verb",
      },
    ]);
  });

  it("matches case-insensitively", () => {
    expect(meaningSegments("[noun]", exampleSlots)).toEqual([
      {
        type: "slot",
        slotId: "s2",
        placeholder: "noun",
      },
    ]);
  });

  it("degrades an unmatched placeholder to plain text", () => {
    expect(meaningSegments("some [Particle] here", exampleSlots)).toEqual([
      {
        type: "text",
        text: "some ",
      },
      {
        type: "text",
        text: "Particle",
      },
      {
        type: "text",
        text: " here",
      },
    ]);
  });

  it("resolves a repeated placeholder every time", () => {
    const segments = meaningSegments("[Noun] of [Noun]", exampleSlots);
    expect(segments.filter(s => s.type === "slot")).toHaveLength(2);
  });

  it("returns one text segment when there are no brackets", () => {
    expect(meaningSegments("just text", exampleSlots)).toEqual([
      {
        type: "text",
        text: "just text",
      },
    ]);
  });
});

import type { ConstructionSlot, GrammarConstruction } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import {
  alternativeDisplay,
  constructionLiterals,
  derivePattern,
  hasBlocks,
  matchesConstruction,
  meaningSegments,
  slotToken,
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

describe("slotToken", () => {
  it("joins alternative labels with a slash", () => {
    expect(slotToken(exampleSlots[0]!)).toBe("Adj/Verb");
    expect(slotToken(exampleSlots[1]!)).toBe("Noun");
  });

  it("skips empty labels", () => {
    expect(slotToken(slot("s", [alt("a", " "), alt("b", "Verb")]))).toBe("Verb");
  });
});

describe("constructionLiterals", () => {
  const construction = (
    over: Partial<GrammarConstruction>,
  ): GrammarConstruction => ({
    id: "c",
    pattern: "",
    note: null,
    ...over,
  });

  it("collects literal alternative labels from blocks", () => {
    expect(constructionLiterals(construction({
      slots: [
        slot("s1", [alt("a1", "Verb", ["Nai"])]),
        slot("s2", [alt("a2", "と", [], {
          literal: true,
        })]),
        slot("s3", [alt("a3", "いけない", [], {
          literal: true,
        })]),
      ],
    }))).toEqual(["と", "いけない"]);
  });

  it("is empty for a block construction with no literals", () => {
    expect(constructionLiterals(construction({
      slots: [slot("s1", [alt("a1", "Noun")])],
    }))).toEqual([]);
  });

  it("uses the stripped pattern for a flat construction", () => {
    expect(constructionLiterals(construction({
      pattern: "〜ないと いけない",
    }))).toEqual(["ないといけない"]);
  });

  it("normalizes width and strips tilde variants", () => {
    expect(constructionLiterals(construction({
      pattern: "～ｶﾞ",
    }))).toEqual(["ガ"]);
  });

  it("dedupes repeated literals", () => {
    expect(constructionLiterals(construction({
      slots: [
        slot("s1", [alt("a1", "の", [], {
          literal: true,
        })]),
        slot("s2", [alt("a2", "の", [], {
          literal: true,
        })]),
      ],
    }))).toEqual(["の"]);
  });
});

describe("matchesConstruction", () => {
  const c: GrammarConstruction = {
    id: "c",
    pattern: "Verb(Nai) + と + いけない",
    note: null,
    slots: [
      slot("s1", [alt("a1", "Verb", ["Nai"])]),
      slot("s2", [alt("a2", "と", [], {
        literal: true,
      })]),
      slot("s3", [alt("a3", "いけない", [], {
        literal: true,
      })]),
    ],
  };

  it("requires every literal (ALL semantics)", () => {
    expect(matchesConstruction("行かないといけない。", c)).toBe(true);
    expect(matchesConstruction("先生とご飯を食べた。", c)).toBe(false);
  });

  it("never matches without literals", () => {
    expect(matchesConstruction("なんでも", {
      id: "c2",
      pattern: "",
      note: null,
      slots: [slot("s1", [alt("a1", "Noun")])],
    })).toBe(false);
  });

  it("matches a flat construction by contained pattern", () => {
    expect(matchesConstruction("勉強しないといけない。", {
      id: "c3",
      pattern: "〜ないといけない",
      note: null,
    })).toBe(true);
  });

  it("normalizes the sentence side", () => {
    expect(matchesConstruction("ｲｹﾅｲと言った。", {
      id: "c4",
      pattern: "〜イケナイ",
      note: null,
    })).toBe(true);
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

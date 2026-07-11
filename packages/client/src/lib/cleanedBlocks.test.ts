import type { Capture, CleanedBlocks, OcrBlock } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import {
  deleteLine,
  deleteLines,
  deriveItems,
  joinLines,
  langNameFor,
  linkLines,
  moveGroup,
  normalizeOrder,
  seedCleanedBlocks,
  setGroupKind,
  setKindForLines,
  setLinesRole,
  toggleIgnoredLang,
  unlinkLines,
} from "./cleanedBlocks";

function block(text: string, lang: string): OcrBlock {
  return {
    text,
    lang,
    bbox: [[0, 0], [1, 0], [1, 1], [0, 1]],
    confidence: 0.9,
    engine: "paddleocr",
  };
}

function capture(overrides: Partial<Capture> = {}): Capture {
  return {
    id: "cap-1",
    title: null,
    text: "",
    cleanedText: null,
    cleanedBlocks: null,
    blocks: [],
    engines: ["paddleocr"],
    sourceId: null,
    page: null,
    notes: null,
    status: "new",
    hasImage: false,
    imageWidth: null,
    imageHeight: null,
    imageMime: null,
    createdAt: "2026-07-11T00:00:00.000Z",
    ...overrides,
  };
}

const DERIVE_OPTS = {
  captureId: "cap-1",
  sourceId: null,
  page: "",
  tags: "",
  notes: "",
  batchLanguage: "Japanese",
  suggestLinks: () => [],
};

describe("langNameFor / joinLines", () => {
  it("maps known codes and falls back for unknown ones", () => {
    expect(langNameFor("ja", "Japanese")).toBe("Japanese");
    expect(langNameFor("en", "Japanese")).toBe("English");
    expect(langNameFor("xx", "Japanese")).toBe("Japanese");
  });

  it("joins CJK without spaces and latin with spaces", () => {
    expect(joinLines(["毎朝", "コーヒーを飲む"], "ja")).toBe("毎朝コーヒーを飲む");
    expect(joinLines(["I drink", "coffee"], "en")).toBe("I drink coffee");
  });
});

describe("seedCleanedBlocks", () => {
  it("seeds one sentence group per OCR block, carrying the block language", () => {
    const cb = seedCleanedBlocks(capture({
      blocks: [block("毎朝", "ja"), block("every morning", "en")],
    }));
    expect(cb.lines).toHaveLength(2);
    expect(cb.groups).toHaveLength(2);
    expect(cb.ignoredLangs).toEqual([]);
    expect(cb.lines.map(l => l.lang)).toEqual(["ja", "en"]);
    expect(cb.lines.every(l => l.role === "text")).toBe(true);
    // Each line has its own group, each a sentence.
    expect(new Set(cb.lines.map(l => l.group)).size).toBe(2);
    expect(cb.groups.every(g => g.kind === "sentence")).toBe(true);
  });

  it("falls back to splitting cleanedText on newlines when there are no blocks", () => {
    const cb = seedCleanedBlocks(capture({
      blocks: [],
      cleanedText: "行一\n\n行二\n",
    }));
    expect(cb.lines.map(l => l.text)).toEqual(["行一", "行二"]);
    expect(cb.lines.every(l => l.lang === "ja")).toBe(true);
  });

  it("still produces unique ids when crypto.randomUUID is unavailable (plain HTTP)", () => {
    const original = globalThis.crypto.randomUUID;
    try {
      // Simulate a non-secure context where randomUUID is undefined.
      Object.defineProperty(globalThis.crypto, "randomUUID", {
        value: undefined,
        configurable: true,
      });
      const cb = seedCleanedBlocks(capture({
        blocks: [block("一", "ja"), block("二", "ja")],
      }));
      const ids = [...cb.lines.map(l => l.id), ...cb.groups.map(g => g.id)];
      expect(ids.every(id => typeof id === "string" && id.length > 0)).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    }
    finally {
      Object.defineProperty(globalThis.crypto, "randomUUID", {
        value: original,
        configurable: true,
      });
    }
  });
});

describe("deriveItems", () => {
  it("joins CJK text lines in one group into a single sentence, translation from translation lines", () => {
    const g = "g1";
    const cb: CleanedBlocks = {
      lines: [
        {
          id: "a",
          text: "毎朝",
          lang: "ja",
          role: "text",
          group: g,
        },
        {
          id: "b",
          text: "コーヒーを飲む",
          lang: "ja",
          role: "text",
          group: g,
        },
        {
          id: "c",
          text: "I drink coffee every morning",
          lang: "en",
          role: "translation",
          group: g,
        },
      ],
      groups: [{
        id: g,
        kind: "sentence",
      }],
      ignoredLangs: [],
    };
    const {
      sentences, vocab, skipped,
    } = deriveItems(cb, DERIVE_OPTS);
    expect(vocab).toHaveLength(0);
    expect(skipped).toBe(0);
    expect(sentences).toHaveLength(1);
    expect(sentences[0].text).toBe("毎朝コーヒーを飲む");
    expect(sentences[0].translation).toBe("I drink coffee every morning");
    expect(sentences[0].language).toBe("Japanese");
    expect(sentences[0].captureId).toBe("cap-1");
  });

  it("builds a vocab entry with furigana as the reading and translation as the meaning", () => {
    const g = "g1";
    const cb: CleanedBlocks = {
      lines: [
        {
          id: "a",
          text: "毎朝",
          lang: "ja",
          role: "text",
          group: g,
        },
        {
          id: "b",
          text: "まいあさ",
          lang: "ja",
          role: "furigana",
          group: g,
        },
        {
          id: "c",
          text: "every morning",
          lang: "en",
          role: "translation",
          group: g,
        },
      ],
      groups: [{
        id: g,
        kind: "vocab",
      }],
      ignoredLangs: [],
    };
    const {
      sentences, vocab,
    } = deriveItems(cb, DERIVE_OPTS);
    expect(sentences).toHaveLength(0);
    expect(vocab).toHaveLength(1);
    expect(vocab[0].term).toBe("毎朝");
    expect(vocab[0].reading).toBe("まいあさ");
    expect(vocab[0].meaning).toBe("every morning");
  });

  it("ignores furigana on a sentence group (sentences have no reading field)", () => {
    const g = "g1";
    const cb: CleanedBlocks = {
      lines: [
        {
          id: "a",
          text: "毎朝",
          lang: "ja",
          role: "text",
          group: g,
        },
        {
          id: "b",
          text: "まいあさ",
          lang: "ja",
          role: "furigana",
          group: g,
        },
      ],
      groups: [{
        id: g,
        kind: "sentence",
      }],
      ignoredLangs: [],
    };
    const {
      sentences,
    } = deriveItems(cb, DERIVE_OPTS);
    expect(sentences).toHaveLength(1);
    expect(sentences[0].text).toBe("毎朝");
    // No reading anywhere on the sentence input.
    expect("reading" in sentences[0]).toBe(false);
  });

  it("skips groups with no text-role content (structure-only, translation-only)", () => {
    const cb: CleanedBlocks = {
      lines: [
        {
          id: "a",
          text: "Chapter 3",
          lang: "en",
          role: "structure",
          group: "g1",
        },
        {
          id: "b",
          text: "orphan translation",
          lang: "en",
          role: "translation",
          group: "g2",
        },
        {
          id: "c",
          text: "犬",
          lang: "ja",
          role: "text",
          group: "g3",
        },
      ],
      groups: [
        {
          id: "g1",
          kind: "sentence",
        },
        {
          id: "g2",
          kind: "sentence",
        },
        {
          id: "g3",
          kind: "sentence",
        },
      ],
      ignoredLangs: [],
    };
    const {
      sentences, skipped,
    } = deriveItems(cb, DERIVE_OPTS);
    expect(sentences).toHaveLength(1);
    expect(sentences[0].text).toBe("犬");
    expect(skipped).toBe(2);
  });

  it("excludes lines whose language is ignored", () => {
    const cb: CleanedBlocks = {
      lines: [
        {
          id: "a",
          text: "犬",
          lang: "ja",
          role: "text",
          group: "g1",
        },
        {
          id: "b",
          text: "狗",
          lang: "zh",
          role: "text",
          group: "g2",
        },
      ],
      groups: [
        {
          id: "g1",
          kind: "sentence",
        },
        {
          id: "g2",
          kind: "sentence",
        },
      ],
      ignoredLangs: ["zh"],
    };
    const {
      sentences, skipped,
    } = deriveItems(cb, DERIVE_OPTS);
    expect(sentences).toHaveLength(1);
    expect(sentences[0].text).toBe("犬");
    // The Chinese-only group vanished entirely (not counted as skipped).
    expect(skipped).toBe(0);
  });

  it("carries shared batch metadata onto every derived item", () => {
    const cb: CleanedBlocks = {
      lines: [{
        id: "a",
        text: "犬",
        lang: "ja",
        role: "text",
        group: "g1",
      }],
      groups: [{
        id: "g1",
        kind: "sentence",
      }],
      ignoredLangs: [],
    };
    const {
      sentences,
    } = deriveItems(cb, {
      ...DERIVE_OPTS,
      sourceId: "src-1",
      page: " 12 ",
      tags: "animals",
      suggestLinks: () => ["v1", "v2"],
    });
    expect(sentences[0].sourceId).toBe("src-1");
    expect(sentences[0].page).toBe("12");
    expect(sentences[0].tags).toBe("animals");
    expect(sentences[0].vocabIds).toEqual(["v1", "v2"]);
  });

  it("excludes lines with the ignore role (like structure)", () => {
    const g = "g1";
    const cb: CleanedBlocks = {
      lines: [
        {
          id: "a",
          text: "犬",
          lang: "ja",
          role: "text",
          group: g,
        },
        {
          id: "b",
          text: "noise",
          lang: "en",
          role: "ignore",
          group: g,
        },
      ],
      groups: [{
        id: g,
        kind: "sentence",
      }],
      ignoredLangs: [],
    };
    const {
      sentences,
    } = deriveItems(cb, DERIVE_OPTS);
    expect(sentences).toHaveLength(1);
    expect(sentences[0].text).toBe("犬");
  });
});

describe("reducers", () => {
  const twoGroups: CleanedBlocks = {
    lines: [
      {
        id: "a",
        text: "毎朝",
        lang: "ja",
        role: "text",
        group: "g1",
      },
      {
        id: "b",
        text: "コーヒー",
        lang: "ja",
        role: "text",
        group: "g2",
      },
    ],
    groups: [
      {
        id: "g1",
        kind: "sentence",
      },
      {
        id: "g2",
        kind: "sentence",
      },
    ],
    ignoredLangs: [],
  };

  it("linkLines joins the selected lines into the earliest one's group (kept contiguous)", () => {
    const next = linkLines(twoGroups, ["b", "a"]);
    // Both lines share group g1 (a's group); g2 is pruned.
    expect(next.lines.map(l => l.group)).toEqual(["g1", "g1"]);
    expect(next.groups.map(g => g.id)).toEqual(["g1"]);
  });

  it("linkLines keeps the anchor group's kind", () => {
    const withVocab = setGroupKind(twoGroups, "g1", "vocab");
    const next = linkLines(withVocab, ["a", "b"]);
    expect(next.groups).toEqual([{
      id: "g1",
      kind: "vocab",
    }]);
  });

  it("unlinkLines splits selected lines into fresh singleton groups", () => {
    const linked = linkLines(twoGroups, ["a", "b"]);
    const next = unlinkLines(linked, ["a", "b"]);
    const groups = next.lines.map(l => l.group);
    expect(new Set(groups).size).toBe(2);
    expect(next.groups).toHaveLength(2);
    expect(next.groups.every(g => g.kind === "sentence")).toBe(true);
  });

  it("setLinesRole bulk-sets the role, including ignore", () => {
    const next = setLinesRole(twoGroups, ["a", "b"], "ignore");
    expect(next.lines.every(l => l.role === "ignore")).toBe(true);
  });

  it("setKindForLines sets kind on every group owning a selected line", () => {
    const next = setKindForLines(twoGroups, ["a", "b"], "vocab");
    expect(next.groups.every(g => g.kind === "vocab")).toBe(true);
  });

  it("deleteLines removes all selected lines and prunes emptied groups", () => {
    const next = deleteLines(twoGroups, ["a"]);
    expect(next.lines.map(l => l.id)).toEqual(["b"]);
    expect(next.groups.map(g => g.id)).toEqual(["g2"]);
  });

  it("deleteLine removes the line and prunes its now-empty group", () => {
    const next = deleteLine(twoGroups, "a");
    expect(next.lines.map(l => l.id)).toEqual(["b"]);
    expect(next.groups.map(g => g.id)).toEqual(["g2"]);
  });

  it("moveGroup moves a whole group past its neighbor, lines staying together", () => {
    // g1 = [a, a2], g2 = [b]; moving g1 down puts b first, then a, a2.
    const grouped: CleanedBlocks = {
      lines: [
        {
          id: "a",
          text: "毎",
          lang: "ja",
          role: "text",
          group: "g1",
        },
        {
          id: "a2",
          text: "朝",
          lang: "ja",
          role: "text",
          group: "g1",
        },
        {
          id: "b",
          text: "犬",
          lang: "ja",
          role: "text",
          group: "g2",
        },
      ],
      groups: [
        {
          id: "g1",
          kind: "sentence",
        },
        {
          id: "g2",
          kind: "sentence",
        },
      ],
      ignoredLangs: [],
    };
    const next = moveGroup(grouped, "g1", "down");
    expect(next.lines.map(l => l.id)).toEqual(["b", "a", "a2"]);
  });

  it("normalizeOrder pulls a group's scattered lines contiguous", () => {
    const scattered: CleanedBlocks = {
      lines: [
        {
          id: "a",
          text: "1",
          lang: "ja",
          role: "text",
          group: "g1",
        },
        {
          id: "b",
          text: "2",
          lang: "ja",
          role: "text",
          group: "g2",
        },
        {
          id: "c",
          text: "3",
          lang: "ja",
          role: "text",
          group: "g1",
        },
      ],
      groups: [
        {
          id: "g1",
          kind: "sentence",
        },
        {
          id: "g2",
          kind: "sentence",
        },
      ],
      ignoredLangs: [],
    };
    const next = normalizeOrder(scattered);
    expect(next.lines.map(l => l.id)).toEqual(["a", "c", "b"]);
  });

  it("toggleIgnoredLang adds then removes a code", () => {
    const on = toggleIgnoredLang(twoGroups, "zh");
    expect(on.ignoredLangs).toEqual(["zh"]);
    const off = toggleIgnoredLang(on, "zh");
    expect(off.ignoredLangs).toEqual([]);
  });
});

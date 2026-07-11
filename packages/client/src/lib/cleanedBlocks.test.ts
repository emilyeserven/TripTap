import type { Capture, CleanedBlocks, OcrBlock } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import {
  deleteLine,
  deriveItems,
  joinLines,
  langNameFor,
  mergeIntoPrevGroup,
  seedCleanedBlocks,
  setGroupKind,
  toggleIgnoredLang,
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

  it("mergeIntoPrevGroup moves a line up and prunes the emptied group", () => {
    const next = mergeIntoPrevGroup(twoGroups, "b");
    expect(next.lines.map(l => l.group)).toEqual(["g1", "g1"]);
    expect(next.groups.map(g => g.id)).toEqual(["g1"]);
  });

  it("merged line inherits the target group's kind via the shared group", () => {
    const withVocab = setGroupKind(twoGroups, "g1", "vocab");
    const next = mergeIntoPrevGroup(withVocab, "b");
    expect(next.groups).toEqual([{
      id: "g1",
      kind: "vocab",
    }]);
  });

  it("deleteLine removes the line and prunes its now-empty group", () => {
    const next = deleteLine(twoGroups, "a");
    expect(next.lines.map(l => l.id)).toEqual(["b"]);
    expect(next.groups.map(g => g.id)).toEqual(["g2"]);
  });

  it("toggleIgnoredLang adds then removes a code", () => {
    const on = toggleIgnoredLang(twoGroups, "zh");
    expect(on.ignoredLangs).toEqual(["zh"]);
    const off = toggleIgnoredLang(on, "zh");
    expect(off.ignoredLangs).toEqual([]);
  });
});

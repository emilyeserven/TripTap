import type { Capture, CleanedBlocks, CleanedGroupKind, CleanedLineRole, OcrBlock } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import {
  deleteLine,
  deleteLines,
  deriveItems,
  joinLines,
  langNameFor,
  linkGroups,
  moveItem,
  normalizeOrder,
  seedCleanedBlocks,
  setGroupKind,
  setKindForLines,
  setLinesRole,
  stitchLines,
  toggleIgnoredLang,
  unlinkGroups,
  unstitchLines,
  updateLineLang,
  updateLineRole,
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

/** Terse fixture builders so the group `link` field doesn't clutter every test. */
function ln(
  id: string,
  text: string,
  lang: string,
  role: CleanedLineRole,
  group: string,
): CleanedBlocks["lines"][number] {
  return {
    id,
    text,
    lang,
    role,
    group,
  };
}

function grp(id: string, kind: CleanedGroupKind, link: string | null = null): CleanedBlocks["groups"][number] {
  return {
    id,
    kind,
    link,
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
  it("seeds one standalone stitch per OCR block, carrying the block language", () => {
    const cb = seedCleanedBlocks(capture({
      blocks: [block("毎朝", "ja"), block("every morning", "en")],
    }));
    expect(cb.lines).toHaveLength(2);
    expect(cb.groups).toHaveLength(2);
    expect(cb.ignoredLangs).toEqual([]);
    expect(cb.lines.map(l => l.lang)).toEqual(["ja", "en"]);
    expect(cb.lines.every(l => l.role === "text")).toBe(true);
    expect(new Set(cb.lines.map(l => l.group)).size).toBe(2);
    expect(cb.groups.every(g => g.kind === "sentence" && g.link === null)).toBe(true);
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
  it("concatenates stitched text lines into one sentence with the translation from translation lines", () => {
    const cb: CleanedBlocks = {
      lines: [
        ln("a", "毎朝", "ja", "text", "g1"),
        ln("b", "コーヒーを飲む", "ja", "text", "g1"),
        ln("c", "I drink coffee every morning", "en", "translation", "g1"),
      ],
      groups: [grp("g1", "sentence")],
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
  });

  it("merges a linked text-stitch and translation-stitch into ONE sentence (not concatenated)", () => {
    const cb: CleanedBlocks = {
      lines: [
        ln("a", "毎朝コーヒーを飲む", "ja", "text", "g1"),
        ln("b", "I drink coffee every morning", "en", "translation", "g2"),
      ],
      groups: [grp("g1", "sentence", "L1"), grp("g2", "sentence", "L1")],
      ignoredLangs: [],
    };
    const {
      sentences,
    } = deriveItems(cb, DERIVE_OPTS);
    expect(sentences).toHaveLength(1);
    expect(sentences[0].text).toBe("毎朝コーヒーを飲む");
    expect(sentences[0].translation).toBe("I drink coffee every morning");
  });

  it("merges a linked term + furigana + meaning into one vocab entry", () => {
    const cb: CleanedBlocks = {
      lines: [
        ln("a", "毎朝", "ja", "text", "g1"),
        ln("b", "まいあさ", "ja", "furigana", "g2"),
        ln("c", "every morning", "en", "translation", "g3"),
      ],
      groups: [grp("g1", "vocab", "L1"), grp("g2", "vocab", "L1"), grp("g3", "vocab", "L1")],
      ignoredLangs: [],
    };
    const {
      vocab,
    } = deriveItems(cb, DERIVE_OPTS);
    expect(vocab).toHaveLength(1);
    expect(vocab[0].term).toBe("毎朝");
    expect(vocab[0].reading).toBe("まいあさ");
    expect(vocab[0].meaning).toBe("every morning");
  });

  it("ignores furigana on a sentence item (sentences have no reading field)", () => {
    const cb: CleanedBlocks = {
      lines: [
        ln("a", "毎朝", "ja", "text", "g1"),
        ln("b", "まいあさ", "ja", "furigana", "g1"),
      ],
      groups: [grp("g1", "sentence")],
      ignoredLangs: [],
    };
    const {
      sentences,
    } = deriveItems(cb, DERIVE_OPTS);
    expect(sentences).toHaveLength(1);
    expect(sentences[0].text).toBe("毎朝");
    expect("reading" in sentences[0]).toBe(false);
  });

  it("skips items with no text-role content", () => {
    const cb: CleanedBlocks = {
      lines: [
        ln("a", "Chapter 3", "en", "structure", "g1"),
        ln("b", "犬", "ja", "text", "g2"),
      ],
      groups: [grp("g1", "sentence"), grp("g2", "sentence")],
      ignoredLangs: [],
    };
    const {
      sentences, skipped,
    } = deriveItems(cb, DERIVE_OPTS);
    expect(sentences).toHaveLength(1);
    expect(sentences[0].text).toBe("犬");
    expect(skipped).toBe(1);
  });

  it("excludes lines with the ignore role", () => {
    const cb: CleanedBlocks = {
      lines: [
        ln("a", "犬", "ja", "text", "g1"),
        ln("b", "noise", "en", "ignore", "g1"),
      ],
      groups: [grp("g1", "sentence")],
      ignoredLangs: [],
    };
    const {
      sentences,
    } = deriveItems(cb, DERIVE_OPTS);
    expect(sentences).toHaveLength(1);
    expect(sentences[0].text).toBe("犬");
  });

  it("excludes lines whose language is ignored", () => {
    const cb: CleanedBlocks = {
      lines: [
        ln("a", "犬", "ja", "text", "g1"),
        ln("b", "狗", "zh", "text", "g2"),
      ],
      groups: [grp("g1", "sentence"), grp("g2", "sentence")],
      ignoredLangs: ["zh"],
    };
    const {
      sentences, skipped,
    } = deriveItems(cb, DERIVE_OPTS);
    expect(sentences).toHaveLength(1);
    expect(sentences[0].text).toBe("犬");
    expect(skipped).toBe(0);
  });

  it("carries shared batch metadata onto every derived item", () => {
    const cb: CleanedBlocks = {
      lines: [ln("a", "犬", "ja", "text", "g1")],
      groups: [grp("g1", "sentence")],
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
  function twoStitches(): CleanedBlocks {
    return {
      lines: [
        ln("a", "毎朝", "ja", "text", "g1"),
        ln("b", "コーヒー", "ja", "text", "g2"),
      ],
      groups: [grp("g1", "sentence"), grp("g2", "sentence")],
      ignoredLangs: [],
    };
  }

  it("stitchLines joins selected lines into the earliest one's stitch (kept contiguous)", () => {
    const next = stitchLines(twoStitches(), ["b", "a"]);
    expect(next.lines.map(l => l.group)).toEqual(["g1", "g1"]);
    expect(next.groups.map(g => g.id)).toEqual(["g1"]);
  });

  it("unstitchLines splits selected lines into fresh standalone stitches", () => {
    const stitched = stitchLines(twoStitches(), ["a", "b"]);
    const next = unstitchLines(stitched, ["a", "b"]);
    expect(new Set(next.lines.map(l => l.group)).size).toBe(2);
    expect(next.groups).toHaveLength(2);
    expect(next.groups.every(g => g.link === null)).toBe(true);
  });

  it("linkGroups links the two stitches into one item with synced kind", () => {
    const withVocab = setGroupKind(twoStitches(), "g1", "vocab");
    const next = linkGroups(withVocab, ["a", "b"]);
    const links = next.groups.map(g => g.link);
    expect(links[0]).not.toBeNull();
    expect(links[0]).toBe(links[1]);
    expect(next.groups.every(g => g.kind === "vocab")).toBe(true);
  });

  it("linkGroups is a no-op when fewer than two distinct stitches are selected", () => {
    const cb = twoStitches();
    expect(linkGroups(cb, ["a"])).toBe(cb);
  });

  it("unlinkGroups clears the shared link", () => {
    const linked = linkGroups(twoStitches(), ["a", "b"]);
    const next = unlinkGroups(linked, ["a", "b"]);
    expect(next.groups.every(g => g.link === null)).toBe(true);
  });

  it("updateLineLang / updateLineRole sync across the whole stitch", () => {
    const cb: CleanedBlocks = {
      lines: [
        ln("a", "毎朝", "ja", "text", "g1"),
        ln("b", "コーヒー", "ja", "text", "g1"),
      ],
      groups: [grp("g1", "sentence")],
      ignoredLangs: [],
    };
    expect(updateLineLang(cb, "a", "en").lines.every(l => l.lang === "en")).toBe(true);
    expect(updateLineRole(cb, "a", "structure").lines.every(l => l.role === "structure")).toBe(true);
  });

  it("setGroupKind syncs kind across all stitches sharing the link", () => {
    const linked = linkGroups(twoStitches(), ["a", "b"]);
    const next = setGroupKind(linked, linked.lines[0].group, "vocab");
    expect(next.groups.every(g => g.kind === "vocab")).toBe(true);
  });

  it("setKindForLines propagates to linked partners", () => {
    const linked = linkGroups(twoStitches(), ["a", "b"]);
    // Select only one line; its linked partner should still flip.
    const next = setKindForLines(linked, ["a"], "vocab");
    expect(next.groups.every(g => g.kind === "vocab")).toBe(true);
  });

  it("setLinesRole bulk-sets the role, including ignore", () => {
    const next = setLinesRole(twoStitches(), ["a", "b"], "ignore");
    expect(next.lines.every(l => l.role === "ignore")).toBe(true);
  });

  it("deleteLines / deleteLine remove lines and prune emptied stitches", () => {
    expect(deleteLines(twoStitches(), ["a"]).groups.map(g => g.id)).toEqual(["g2"]);
    expect(deleteLine(twoStitches(), "a").lines.map(l => l.id)).toEqual(["b"]);
  });

  it("moveItem moves a whole linked item past its neighbor, together", () => {
    const cb: CleanedBlocks = {
      lines: [
        ln("a", "text", "ja", "text", "g1"),
        ln("b", "translation", "en", "translation", "g2"),
        ln("c", "other", "ja", "text", "g3"),
      ],
      groups: [grp("g1", "sentence", "L1"), grp("g2", "sentence", "L1"), grp("g3", "sentence")],
      ignoredLangs: [],
    };
    const next = moveItem(cb, "g1", "down");
    expect(next.lines.map(l => l.id)).toEqual(["c", "a", "b"]);
  });

  it("normalizeOrder keeps linked stitches adjacent", () => {
    const cb: CleanedBlocks = {
      lines: [
        ln("a", "1", "ja", "text", "g1"),
        ln("b", "2", "ja", "text", "g2"),
        ln("c", "3", "ja", "translation", "g3"),
      ],
      // g1 and g3 are linked; g2 sits between them in array order.
      groups: [grp("g1", "sentence", "L1"), grp("g2", "sentence"), grp("g3", "sentence", "L1")],
      ignoredLangs: [],
    };
    const next = normalizeOrder(cb);
    expect(next.lines.map(l => l.id)).toEqual(["a", "c", "b"]);
  });

  it("toggleIgnoredLang adds then removes a code", () => {
    const on = toggleIgnoredLang(twoStitches(), "zh");
    expect(on.ignoredLangs).toEqual(["zh"]);
    expect(toggleIgnoredLang(on, "zh").ignoredLangs).toEqual([]);
  });
});

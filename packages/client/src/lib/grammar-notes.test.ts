// @vitest-environment node
import type { GrammarNote, GrammarRelation } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import { notesByTagId, otherUsages, resolvedRelations, usageLabel } from "./grammar-notes";

function note(overrides: Partial<GrammarNote> & Pick<GrammarNote, "id" | "tagId" | "title">): GrammarNote {
  return {
    tagName: overrides.title,
    nuance: null,
    summary: null,
    constructions: [],
    relations: [],
    resources: [],
    starred: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function relation(tagId: string, over: Partial<GrammarRelation> = {}): GrammarRelation {
  return {
    tagId,
    tagName: `tag-${tagId}`,
    kind: "similar",
    note: null,
    ...over,
  };
}

describe("usageLabel", () => {
  it("appends the nuance after an em dash when present", () => {
    expect(usageLabel({
      title: "は",
      nuance: "topic marker",
    })).toBe("は — topic marker");
  });

  it("falls back to the bare title when there is no nuance", () => {
    expect(usageLabel({
      title: "は",
      nuance: null,
    })).toBe("は");
  });
});

describe("notesByTagId", () => {
  it("maps each note by its tag id", () => {
    const a = note({
      id: "1",
      tagId: "t1",
      title: "は",
    });
    const b = note({
      id: "2",
      tagId: "t2",
      title: "が",
    });
    const map = notesByTagId([a, b]);
    expect(map.get("t1")).toBe(a);
    expect(map.get("t2")).toBe(b);
    expect(map.size).toBe(2);
  });
});

describe("otherUsages", () => {
  it("returns notes sharing the surface form, excluding the note itself, sorted by usage label", () => {
    const topic = note({
      id: "1",
      tagId: "t1",
      title: "は",
      nuance: "topic marker",
    });
    const contrast = note({
      id: "2",
      tagId: "t2",
      title: "は",
      nuance: "contrastive",
    });
    const unrelated = note({
      id: "3",
      tagId: "t3",
      title: "が",
    });
    const result = otherUsages([topic, contrast, unrelated], topic);
    // Only the other "は" note, and never the unrelated form.
    expect(result.map(n => n.id)).toEqual(["2"]);
  });

  it("matches surface forms case- and width-insensitively (NFKC)", () => {
    // Full-width "Ｎａ" normalizes to "na" — same key as the ASCII lower-case title.
    const a = note({
      id: "1",
      tagId: "t1",
      title: "na",
    });
    const b = note({
      id: "2",
      tagId: "t2",
      title: "ＮＡ",
    });
    expect(otherUsages([a, b], a).map(n => n.id)).toEqual(["2"]);
  });

  it("returns an empty list when no other note shares the form", () => {
    const only = note({
      id: "1",
      tagId: "t1",
      title: "は",
    });
    expect(otherUsages([only], only)).toEqual([]);
  });
});

describe("resolvedRelations", () => {
  it("resolves an outbound relation and links its target note when one exists", () => {
    const self = note({
      id: "1",
      tagId: "t1",
      title: "は",
      relations: [relation("t2", {
        kind: "antonym",
      })],
    });
    const target = note({
      id: "2",
      tagId: "t2",
      title: "が",
    });
    const [rel, ...rest] = resolvedRelations([self, target], self);
    expect(rest).toHaveLength(0);
    expect(rel).toMatchObject({
      tagId: "t2",
      kind: "antonym",
      inbound: false,
    });
    expect(rel.target).toBe(target);
  });

  it("surfaces an inbound relation declared on another note (bidirectional)", () => {
    const self = note({
      id: "1",
      tagId: "t1",
      title: "は",
    });
    const other = note({
      id: "2",
      tagId: "t2",
      title: "が",
      relations: [relation("t1")],
    });
    const [rel] = resolvedRelations([self, other], self);
    expect(rel).toMatchObject({
      tagId: "t2",
      inbound: true,
    });
    expect(rel.target).toBe(other);
  });

  it("lets an outbound relation win over a duplicate inbound one", () => {
    const self = note({
      id: "1",
      tagId: "t1",
      title: "は",
      relations: [relation("t2", {
        note: "outbound",
      })],
    });
    const other = note({
      id: "2",
      tagId: "t2",
      title: "が",
      relations: [relation("t1", {
        note: "inbound",
      })],
    });
    const resolved = resolvedRelations([self, other], self);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({
      tagId: "t2",
      inbound: false,
      note: "outbound",
    });
  });

  it("dedupes repeated outbound relations to the same tag", () => {
    const self = note({
      id: "1",
      tagId: "t1",
      title: "は",
      relations: [relation("t2"), relation("t2", {
        note: "dup",
      })],
    });
    expect(resolvedRelations([self], self)).toHaveLength(1);
  });
});

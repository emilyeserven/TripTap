import type { DailyLineup, LineupItem } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import {
  customLineupItem,
  effectiveLineup,
  moveItem,
  removeItem,
  renameItem,
  suggestionToLineupItem,
  todayDateString,
  toggleItemDone,
} from "./daily-lineup";

function item(id: string, done = false): LineupItem {
  return {
    id,
    kind: "area",
    area: "Speaking",
    title: `Item ${id}`,
    description: null,
    to: "/shadowing/new",
    done,
  };
}

describe("todayDateString", () => {
  it("uses the local calendar, not UTC", () => {
    // Regardless of the runner's timezone, the local getters must drive the result.
    const d = new Date(2026, 6, 20, 23, 30);
    expect(todayDateString(d)).toBe("2026-07-20");
  });
});

describe("effectiveLineup", () => {
  const stored: DailyLineup = {
    date: "2026-07-19",
    items: [item("a", true)],
    exclusions: {
      mediaTypes: ["Book"],
      sessionTypes: [],
      learningAreas: [],
    },
  };

  it("keeps a lineup built for today", () => {
    expect(effectiveLineup(stored, "2026-07-19")).toBe(stored);
  });

  it("resets a stale lineup (items and exclusions) on a new day", () => {
    const next = effectiveLineup(stored, "2026-07-20");
    expect(next.date).toBe("2026-07-20");
    expect(next.items).toEqual([]);
    expect(next.exclusions.mediaTypes).toEqual([]);
  });

  it("treats an absent lineup as an empty day", () => {
    expect(effectiveLineup(null, "2026-07-20").items).toEqual([]);
  });
});

describe("lineup item helpers", () => {
  it("snapshots a suggestion as a not-done item", () => {
    const snapshotted = suggestionToLineupItem({
      id: "s1",
      kind: "starred-grammar",
      area: "Grammar",
      title: "Revisit は",
      description: "You starred this.",
      to: "/grammar-notes/$id",
      params: {
        id: "n1",
      },
    });
    expect(snapshotted.done).toBe(false);
    expect(snapshotted.params).toEqual({
      id: "n1",
    });
  });

  it("carries the resource/section origin onto the snapshot", () => {
    const snapshotted = suggestionToLineupItem({
      id: "section-x",
      kind: "area",
      area: "Reading",
      title: "Read \"Ch. 1\" of Book",
      description: null,
      to: "/reading-sessions/new",
      resourceId: "bk1",
      sectionId: "sec1",
    });
    expect(snapshotted.resourceId).toBe("bk1");
    expect(snapshotted.sectionId).toBe("sec1");
  });

  it("builds a custom item with a fresh custom-prefixed id and no done flag", () => {
    const custom = customLineupItem({
      title: "Review yesterday's mistakes",
      description: "Drill the ones I skipped.",
      area: "Grammar",
      to: "/drill-sessions/new",
    });
    expect(custom.kind).toBe("custom");
    expect(custom.id.startsWith("custom-")).toBe(true);
    expect(custom.done).toBe(false);
    expect(custom.title).toBe("Review yesterday's mistakes");
    // Two custom items never share an id (so reroll dedupe can't clobber one).
    expect(customLineupItem({
      title: "a",
      description: null,
      area: null,
      to: "/reading-sessions/new",
    }).id).not.toBe(custom.id);
  });

  it("renames an item by id, ignoring blank titles", () => {
    const items = [item("a"), item("b")];
    expect(renameItem(items, "a", "  New name ").find(i => i.id === "a")?.title).toBe("New name");
    expect(renameItem(items, "a", "   ")).toBe(items);
  });

  it("toggles done state by id", () => {
    const items = toggleItemDone([item("a"), item("b")], "b");
    expect(items[1].done).toBe(true);
    expect(items[0].done).toBe(false);
  });

  it("moves items and clamps at the edges", () => {
    const items = [item("a"), item("b"), item("c")];
    expect(moveItem(items, 2, -1).map(i => i.id)).toEqual(["a", "c", "b"]);
    expect(moveItem(items, 0, -1)).toBe(items);
    expect(moveItem(items, 2, 1)).toBe(items);
  });

  it("removes items by id", () => {
    expect(removeItem([item("a"), item("b")], "a").map(i => i.id)).toEqual(["b"]);
  });
});

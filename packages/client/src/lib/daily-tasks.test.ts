import type { BookmarkSectionNode } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import { nextUncompletedSection, resolveDailyTaskAction } from "./daily-tasks";

function node(
  id: string,
  overrides: Partial<BookmarkSectionNode> = {},
): BookmarkSectionNode {
  return {
    id,
    name: id,
    parentId: null,
    type: "name",
    startValue: null,
    endValue: null,
    url: null,
    tagIds: [],
    completed: false,
    ...overrides,
  };
}

describe("nextUncompletedSection", () => {
  it("returns the first uncompleted leaf in array order", () => {
    const tree = [
      node("a", {
        completed: true,
      }),
      node("b"),
      node("c"),
    ];
    expect(nextUncompletedSection(tree, false)?.id).toBe("b");
  });

  it("prefers a leaf over an uncompleted parent heading", () => {
    const tree = [
      node("ch1", {
        completed: false,
      }),
      node("l1", {
        parentId: "ch1",
        completed: true,
      }),
      node("l2", {
        parentId: "ch1",
        completed: false,
      }),
    ];
    // ch1 is uncompleted but has children, so the next actual work is leaf l2.
    expect(nextUncompletedSection(tree, false)?.id).toBe("l2");
  });

  it("orders by startValue for sequential material, else by array order", () => {
    // Array order puts p7 first; startValue order puts p3 (page 3) first.
    const tree = [
      node("p7", {
        startValue: "7",
      }),
      node("p3", {
        startValue: "3",
      }),
    ];
    expect(nextUncompletedSection(tree, true)?.id).toBe("p3");
    expect(nextUncompletedSection(tree, false)?.id).toBe("p7");
  });

  it("returns null when everything is completed or the tree is empty", () => {
    expect(nextUncompletedSection([node("a", {
      completed: true,
    })], false)).toBeNull();
    expect(nextUncompletedSection([], false)).toBeNull();
  });
});

const RESOURCE = {
  id: "res1",
  title: "Genki I",
  url: "https://example.com/genki",
  tagIds: ["tag-drill"],
};
const DRILL_TAGS = {
  Drills: {
    id: "tag-drill",
    name: "Drills",
  },
};

describe("resolveDailyTaskAction", () => {
  it("links to a reading session prefilled with the next section (sections win)", () => {
    const action = resolveDailyTaskAction({
      resource: RESOURCE,
      sectionTree: [node("l1", {
        name: "Lesson 1",
        completed: true,
      }), node("l2", {
        name: "Lesson 2",
      })],
      drillTags: DRILL_TAGS,
      sequential: false,
    });
    expect(action.kind).toBe("reading-section");
    expect(action.to).toBe("/reading-sessions/new");
    expect(action.label).toBe("Lesson 2");
    // The picked section rides along as a JSON-encoded ref for the reading form to decode.
    expect(JSON.parse(action.search.section).id).toBe("l2");
  });

  it("starts a drill when the resource is Drills-tagged and section-less", () => {
    const action = resolveDailyTaskAction({
      resource: RESOURCE,
      sectionTree: [],
      drillTags: DRILL_TAGS,
      sequential: false,
    });
    expect(action.kind).toBe("drill");
    expect(action.to).toBe("/drill-sessions/new");
    expect(action.search.bookmarkId).toBe("res1");
  });

  it("falls back to a whole-resource reading session", () => {
    const action = resolveDailyTaskAction({
      resource: {
        ...RESOURCE,
        tagIds: [],
      },
      sectionTree: [],
      drillTags: DRILL_TAGS,
      sequential: false,
    });
    expect(action.kind).toBe("reading");
    expect(action.search.section).toBeUndefined();
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  dedupeBookmarksByTitle,
  flattenTimestampSections,
  matchSectionsByTag,
  toBookmarkRecord,
  toOption,
  toOptions,
  toSectionNodes,
  toTaxonomy,
} from "@/services/bookmarks/mappers";

describe("bookmarks mappers", () => {
  it("toOption keeps the fields we depend on and nulls the rest", () => {
    assert.deepEqual(
      toOption({
        id: "t1",
        name: "Vocab",
        parentId: "p1",
        extra: "ignored",
      }),
      {
        id: "t1",
        name: "Vocab",
        parentId: "p1",
        slug: null,
        description: null,
      },
    );
  });

  it("toOption rejects shapes without a string id/name", () => {
    assert.equal(toOption(null), null);
    assert.equal(toOption("nope"), null);
    assert.equal(toOption({
      id: 1,
      name: "x",
    }), null);
    assert.equal(toOption({
      id: "x",
    }), null);
  });

  it("toOptions filters unreadable entries and tolerates non-arrays", () => {
    const options = toOptions([{
      id: "a",
      name: "A",
    }, null, {
      id: 2,
    }]);
    assert.deepEqual(options.map(o => o.id), ["a"]);
    assert.deepEqual(toOptions({
      not: "an array",
    }), []);
  });

  it("toTaxonomy defaults optional fields", () => {
    assert.deepEqual(
      toTaxonomy({
        id: "x1",
        name: "Grammar",
      }),
      {
        id: "x1",
        name: "Grammar",
        slug: "",
        hierarchical: false,
        singleValue: false,
        icon: null,
        termCount: 0,
      },
    );
  });

  it("flattenTimestampSections keeps only complete timestamp entries, recursing into children", () => {
    const sections = flattenTimestampSections([
      {
        sections: [
          {
            type: "timestamp",
            id: "s1",
            name: "Intro",
            startValue: "0:00",
            endValue: "1:00",
            children: [
              {
                type: "timestamp",
                id: "s2",
                startValue: "0:10",
                endValue: "0:20",
              },
              {
                type: "timestamp",
                id: "missing-end",
                startValue: "0:30",
                endValue: "",
              },
              {
                type: "note",
                id: "not-a-timestamp",
                startValue: "0:40",
                endValue: "0:50",
              },
            ],
          },
        ],
      },
    ]);
    assert.deepEqual(sections.map(s => s.id), ["s1", "s2"]);
    assert.equal(sections[0].label, "Intro");
    assert.equal(sections[1].label, null);
  });

  it("toBookmarkRecord includes sections only when asked", () => {
    const raw = {
      id: "b1",
      title: "Podcast",
      url: "https://example.com",
      sectionsValues: [
        {
          sections: [{
            type: "timestamp",
            id: "s1",
            startValue: "0:00",
            endValue: "1:00",
          }],
        },
      ],
    };
    assert.equal(toBookmarkRecord(raw, false)?.sections.length, 0);
    assert.equal(toBookmarkRecord(raw, false)?.sectionTree.length, 0);
    assert.equal(toBookmarkRecord(raw, true)?.sections.length, 1);
    assert.equal(toBookmarkRecord(raw, true)?.sectionTree.length, 1);
    assert.equal(toBookmarkRecord({
      title: "no id",
    }, true), null);
  });

  it("toSectionNodes keeps every entry type, preserving hierarchy via parentId", () => {
    const nodes = toSectionNodes([
      {
        sections: [
          {
            type: "name",
            id: "ch1",
            name: "Chapter 1",
            startValue: "",
            children: [
              {
                type: "page",
                id: "l1",
                name: "Lesson 1",
                startValue: "12",
                tagIds: ["g1", 42, "g2"],
              },
              {
                type: "timestamp",
                id: "l2",
                name: "Clip",
                startValue: "1:00",
                endValue: "2:00",
              },
            ],
          },
          {
            type: "url",
            id: "ext",
            name: "External",
            startValue: "",
            url: "https://example.com/ch",
          },
        ],
      },
    ]);
    assert.deepEqual(nodes.map(n => [n.id, n.parentId, n.type]), [
      ["ch1", null, "name"],
      ["l1", "ch1", "page"],
      ["l2", "ch1", "timestamp"],
      ["ext", null, "url"],
    ]);
    // Positional values + tagIds (non-strings dropped) carried through; empty strings become null.
    assert.equal(nodes[1].startValue, "12");
    assert.deepEqual(nodes[1].tagIds, ["g1", "g2"]);
    assert.equal(nodes[2].endValue, "2:00");
    assert.equal(nodes[0].startValue, null);
    assert.equal(nodes[3].url, "https://example.com/ch");
  });

  it("toSectionNodes skips entries without a string id and unknown types default to name", () => {
    const nodes = toSectionNodes([
      {
        sections: [
          {
            id: "ok",
            type: "mystery",
            name: "X",
          },
          {
            type: "name",
            name: "no id",
          },
        ],
      },
    ]);
    assert.deepEqual(nodes.map(n => n.id), ["ok"]);
    assert.equal(nodes[0].type, "name");
  });

  it("matchSectionsByTag returns tagged sections with breadcrumb labels", () => {
    const sectionsValues = [
      {
        sections: [
          {
            type: "name",
            id: "ch1",
            name: "Chapter 1",
            children: [
              {
                type: "page",
                id: "l1",
                name: "Lesson 1",
                startValue: "12",
                tagIds: ["grammar-x"],
              },
              {
                type: "page",
                id: "l2",
                name: "Lesson 2",
                startValue: "20",
                tagIds: ["other"],
              },
            ],
          },
          {
            type: "name",
            id: "ch2",
            name: "Chapter 2",
            tagIds: ["grammar-x"],
          },
        ],
      },
    ];
    const matches = matchSectionsByTag(sectionsValues, "grammar-x");
    assert.deepEqual(matches.map(m => [m.id, m.label]), [
      ["l1", "Chapter 1 › Lesson 1"],
      ["ch2", "Chapter 2"],
    ]);
    assert.equal(matches[0].type, "page");
    assert.equal(matches[0].startValue, "12");
    assert.deepEqual(matchSectionsByTag(sectionsValues, "missing"), []);
  });

  it("dedupeBookmarksByTitle dedupes by id (first wins) and sorts by title", () => {
    const deduped = dedupeBookmarksByTitle([
      {
        id: "b",
        title: "Zeta",
        url: null,
        sections: [],
        sectionTree: [],
      },
      {
        id: "a",
        title: "Alpha",
        url: null,
        sections: [],
        sectionTree: [],
      },
      {
        id: "b",
        title: "Zeta (dupe)",
        url: null,
        sections: [],
        sectionTree: [],
      },
    ]);
    assert.deepEqual(deduped.map(b => b.title), ["Alpha", "Zeta"]);
  });
});

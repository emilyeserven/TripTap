import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  dedupeBookmarksByTitle,
  flattenTimestampSections,
  toBookmarkRecord,
  toOption,
  toOptions,
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
            startValue: "0:00",
            endValue: "1:00",
          }],
        },
      ],
    };
    assert.equal(toBookmarkRecord(raw, false)?.sections.length, 0);
    assert.equal(toBookmarkRecord(raw, true)?.sections.length, 1);
    assert.equal(toBookmarkRecord({
      title: "no id",
    }, true), null);
  });

  it("dedupeBookmarksByTitle dedupes by id (first wins) and sorts by title", () => {
    const deduped = dedupeBookmarksByTitle([
      {
        id: "b",
        title: "Zeta",
        url: null,
        sections: [],
      },
      {
        id: "a",
        title: "Alpha",
        url: null,
        sections: [],
      },
      {
        id: "b",
        title: "Zeta (dupe)",
        url: null,
        sections: [],
      },
    ]);
    assert.deepEqual(deduped.map(b => b.title), ["Alpha", "Zeta"]);
  });
});

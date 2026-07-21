import type {
  BookmarkResource,
  BookmarkSectionMatch,
  GrammarNote,
  LearningAreaTagMap,
  LineupItem,
  QuestionSheet,
  XpSummary,
} from "@sentence-bank/types";

import { LEARNING_AREAS } from "@sentence-bank/types";
import { describe, expect, it } from "vitest";

import { buildStartSuggestions, lowestXpArea, retargetLineupItem } from "./start-recommendations";

const NOW = new Date("2026-07-20T12:00:00Z");

/** Learning-area → tag map so a resource's tagIds resolve to an area (and its session link). */
const AREA_TAGS: LearningAreaTagMap = {
  Speaking: {
    id: "t-speaking",
    name: "Speaking",
  },
  Listening: {
    id: "t-listening",
    name: "Listening",
  },
  Reading: {
    id: "t-reading",
    name: "Reading",
  },
};

function res(over: Partial<BookmarkResource> & { id: string }): BookmarkResource {
  return {
    title: `Resource ${over.id}`,
    url: null,
    website: null,
    runtimeSeconds: null,
    mediaType: null,
    complexity: null,
    progress: null,
    favorite: false,
    contentStatus: null,
    tagIds: [],
    imageUrl: null,
    ...over,
  };
}

function sec(
  bookmarkId: string,
  sectionId: string,
  over: Partial<BookmarkSectionMatch["section"]> = {},
): BookmarkSectionMatch {
  return {
    bookmarkId,
    bookmarkTitle: `Book ${bookmarkId}`,
    bookmarkUrl: null,
    imageUrl: null,
    mediaType: null,
    tagIds: [],
    section: {
      id: sectionId,
      label: sectionId,
      type: "page",
      startValue: null,
      endValue: null,
      completed: false,
      ...over,
    },
  };
}

function summary(xpByArea: Partial<Record<string, number>>): XpSummary {
  const areas = (["Speaking", "Listening", "Reading", "Writing", "Grammar", "Vocabulary"] as const)
    .map(area => ({
      area,
      xp: xpByArea[area] ?? 0,
      byFeature: {},
    }));
  return {
    totalXp: areas.reduce((sum, a) => sum + a.xp, 0),
    areas,
    recent: {
      days: 7,
      totalXp: 0,
      areas: [],
    },
    today: {
      totalXp: 0,
      areas: [],
    },
  };
}

function note(over: Partial<GrammarNote>): GrammarNote {
  return {
    id: "n1",
    tagId: "tag-1",
    tagName: "は",
    title: "は",
    nuance: null,
    summary: null,
    constructions: [],
    relations: [],
    resources: [],
    starred: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

function sheet(over: Partial<QuestionSheet>): QuestionSheet {
  return {
    id: "qs1",
    title: "Particles worksheet",
    source: null,
    sourceBookmark: null,
    section: null,
    dueDate: null,
    learningAreas: ["Grammar"],
    grammarTerms: [],
    layout: "list",
    questions: [],
    grid: null,
    notes: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  } as QuestionSheet;
}

describe("lowestXpArea", () => {
  it("picks the area with the least XP", () => {
    expect(lowestXpArea(summary({
      Speaking: 5,
      Listening: 2,
      Reading: 9,
      Writing: 4,
      Grammar: 3,
      Vocabulary: 8,
    }))).toBe("Listening");
  });

  it("breaks ties in enum order", () => {
    expect(lowestXpArea(summary({}))).toBe("Speaking");
  });
});

describe("buildStartSuggestions", () => {
  it("puts an unmet due sheet before the lowest-area pick", () => {
    const suggestions = buildStartSuggestions({
      summary: summary({
        Speaking: 10,
      }),
      questionSheets: [sheet({
        dueDate: "2026-07-21T00:00:00Z",
      })],
      answerSheets: [],
      now: NOW,
    });
    expect(suggestions[0].kind).toBe("due-sheet");
    expect(suggestions[1].kind).toBe("area");
  });

  it("suggests a concrete section from a tagged resource", () => {
    const suggestions = buildStartSuggestions({
      summary: summary({
        Listening: 3,
        Reading: 3,
        Writing: 3,
        Grammar: 3,
        Vocabulary: 3,
      }),
      areaTags: AREA_TAGS,
      resources: [res({
        id: "b1",
        title: "Terrace House",
        url: "https://example.com/th",
        mediaType: "Video",
        tagIds: ["t-speaking"],
      })],
      sections: [sec("b1", "s1", {
        label: "Ep. 3 › 12:00–14:30",
        type: "timestamp",
        startValue: "12:00",
        endValue: "14:30",
      })],
      now: NOW,
    });
    const pick = suggestions.find(s => s.id === "section-s1");
    expect(pick?.area).toBe("Speaking");
    expect(pick?.title).toContain("Ep. 3");
    expect(pick?.to).toBe("/shadowing/new");
    expect(pick?.search).toMatchObject({
      bookmarkId: "b1",
    });
  });

  it("falls back to the bare per-area session link when there are no resources", () => {
    const suggestions = buildStartSuggestions({
      summary: summary({
        Speaking: 1,
        Listening: 0,
        Reading: 1,
        Writing: 1,
        Grammar: 1,
        Vocabulary: 1,
      }),
      now: NOW,
    });
    const area = suggestions.find(s => s.id === "area-Listening");
    expect(area?.to).toBe("/listening-sessions/new");
    expect(area?.search).toBeUndefined();
  });

  it("surfaces a starred grammar point (as the Grammar pick or its own slot)", () => {
    const suggestions = buildStartSuggestions({
      summary: summary({
        Grammar: 50,
      }),
      grammarNotes: [note({
        id: "n-starred",
        starred: true,
      })],
      now: NOW,
    });
    // Every area now gets a pick, so a starred note surfaces via the Grammar area pick when it isn't
    // claimed by a dedicated starred slot — either way it appears in Up Next.
    expect(suggestions.some(s => s.params?.id === "n-starred")).toBe(true);
  });

  it("prefers a starred note for the Grammar area pick and doesn't repeat it", () => {
    const suggestions = buildStartSuggestions({
      summary: summary({
        Speaking: 9,
        Listening: 9,
        Reading: 9,
        Writing: 9,
        Grammar: 0,
        Vocabulary: 9,
      }),
      grammarNotes: [
        note({
          id: "n-plain",
          tagId: "t-plain",
        }),
        note({
          id: "n-starred",
          tagId: "t-starred",
          title: "しか〜ない",
          starred: true,
        }),
      ],
      now: NOW,
    });
    const area = suggestions.find(s => s.kind === "area");
    expect(area?.params?.id).toBe("n-starred");
    // The starred slot must not repeat the same note the area pick already used.
    const starredSlot = suggestions.find(s => s.kind === "starred-grammar");
    expect(starredSlot).toBeUndefined();
  });

  it("skips excluded areas and picks the next-lowest instead", () => {
    const suggestions = buildStartSuggestions({
      summary: summary({
        Speaking: 0,
        Listening: 1,
        Reading: 9,
        Writing: 9,
        Grammar: 9,
        Vocabulary: 9,
      }),
      exclusions: {
        mediaTypes: [],
        sessionTypes: [],
        learningAreas: ["Speaking"],
      },
      now: NOW,
    });
    const area = suggestions.find(s => s.kind === "area");
    expect(area?.area).toBe("Listening");
  });

  it("produces no area pick when every area is excluded", () => {
    const suggestions = buildStartSuggestions({
      summary: summary({}),
      exclusions: {
        mediaTypes: [],
        sessionTypes: [],
        learningAreas: [...LEARNING_AREAS],
      },
      now: NOW,
    });
    expect(suggestions.find(s => s.kind === "area")).toBeUndefined();
  });

  it("filters excluded media types out of the pool", () => {
    const suggestions = buildStartSuggestions({
      summary: summary({
        Listening: 0,
        Speaking: 9,
        Reading: 9,
        Writing: 9,
        Grammar: 9,
        Vocabulary: 9,
      }),
      areaTags: AREA_TAGS,
      resources: [
        res({
          id: "book",
          mediaType: "Book",
          tagIds: ["t-listening"],
        }),
        res({
          id: "video",
          mediaType: "Video",
          tagIds: ["t-listening"],
        }),
      ],
      exclusions: {
        mediaTypes: ["Book"],
        sessionTypes: [],
        learningAreas: [],
      },
      now: NOW,
    });
    expect(suggestions.find(s => s.id === "resource-video")).toBeDefined();
    expect(suggestions.find(s => s.id === "resource-book")).toBeUndefined();
  });

  it("drops suggestions for excluded session types", () => {
    const suggestions = buildStartSuggestions({
      summary: summary({
        Speaking: 0,
        Listening: 9,
        Reading: 9,
        Writing: 9,
        Grammar: 9,
        Vocabulary: 9,
      }),
      exclusions: {
        mediaTypes: [],
        sessionTypes: ["shadowing"],
        learningAreas: [],
      },
      now: NOW,
    });
    // Speaking is lowest, but its pick targets /shadowing/new, which is ruled out for the day.
    expect(suggestions.find(s => s.to === "/shadowing/new")).toBeUndefined();
  });

  it("floats favorited resources to the front of the pool", () => {
    const base = {
      summary: summary({
        Listening: 0,
        Speaking: 9,
        Reading: 9,
        Writing: 9,
        Grammar: 9,
        Vocabulary: 9,
      }),
      areaTags: AREA_TAGS,
      now: NOW,
    };
    const contentIds = (s: ReturnType<typeof buildStartSuggestions>) =>
      s.filter(x => x.id.startsWith("resource-")).map(x => x.id);
    // A locally-starred resource beats list order…
    const local = buildStartSuggestions({
      ...base,
      resources: [
        res({
          id: "first",
          tagIds: ["t-listening"],
        }),
        res({
          id: "starred",
          tagIds: ["t-listening"],
        }),
      ],
      favoriteResourceIds: ["starred"],
    });
    expect(contentIds(local)[0]).toBe("resource-starred");
    // …and an upstream favorite beats a plain resource when nothing is starred locally.
    const upstream = buildStartSuggestions({
      ...base,
      resources: [
        res({
          id: "plain",
          tagIds: ["t-listening"],
        }),
        res({
          id: "host-fav",
          favorite: true,
          tagIds: ["t-listening"],
        }),
      ],
    });
    expect(contentIds(upstream)[0]).toBe("resource-host-fav");
  });

  it("nudges toward a goal's grammar term when a matching note exists", () => {
    const suggestions = buildStartSuggestions({
      summary: summary({}),
      profile: {
        dailyXpGoal: null,
        goals: [
          {
            id: "g1",
            title: "Master particles",
            notes: null,
            learningAreas: [],
            grammarTerms: [
              {
                id: "t-goal",
                name: "に vs で",
                kind: "tag",
                sourceId: "src",
                sourceLabel: "Grammar",
                category: "grammar",
              },
            ],
            resourceTerms: [],
          },
        ],
      },
      grammarNotes: [note({
        id: "n-goal",
        tagId: "t-goal",
        title: "に vs で",
      })],
      now: NOW,
    });
    // The goal's grammar note surfaces in Up Next — via the Grammar area pick or the dedicated goal
    // slot, depending on which claims it first.
    expect(suggestions.some(s => s.params?.id === "n-goal")).toBe(true);
  });

  it("gates a sequential resource to its first uncompleted section", () => {
    const bookmark = res({
      id: "bk",
      title: "Genki I",
      mediaType: "Book",
      tagIds: ["t-reading", "seq-tag"],
    });
    const suggestions = buildStartSuggestions({
      summary: summary({
        Reading: 0,
        Speaking: 9,
        Listening: 9,
        Writing: 9,
        Grammar: 9,
        Vocabulary: 9,
      }),
      areaTags: AREA_TAGS,
      resources: [bookmark],
      resourcesById: {
        bk: bookmark,
      },
      // Out of order and mixed completion: p.10 done, p.20 & p.30 not.
      sections: [
        sec("bk", "s3", {
          label: "p. 30",
          startValue: "30",
        }),
        sec("bk", "s1", {
          label: "p. 10",
          startValue: "10",
          completed: true,
        }),
        sec("bk", "s2", {
          label: "p. 20",
          startValue: "20",
        }),
      ],
      materialTypeTags: {
        "Sequential Material": {
          id: "seq-tag",
          name: "Sequential",
        },
      },
      now: NOW,
    });
    // The first uncompleted section by page order is p.20 (s2); p.10 is done, p.30 is further ahead.
    expect(suggestions.find(s => s.id === "section-s2")).toBeDefined();
    expect(suggestions.find(s => s.id === "section-s1")).toBeUndefined();
    expect(suggestions.find(s => s.id === "section-s3")).toBeUndefined();
  });

  it("drops resources outside the complexity band", () => {
    const suggestions = buildStartSuggestions({
      summary: summary({
        Reading: 0,
        Speaking: 9,
        Listening: 9,
        Writing: 9,
        Grammar: 9,
        Vocabulary: 9,
      }),
      areaTags: AREA_TAGS,
      resources: [
        res({
          id: "hard",
          complexity: {
            min: 5,
            max: 5,
          },
          tagIds: ["t-reading"],
        }),
        res({
          id: "easy",
          complexity: {
            min: 1,
            max: 1,
          },
          tagIds: ["t-reading"],
        }),
      ],
      complexityScale: {
        min: 0,
        max: 5,
        labels: {},
        schemes: [],
      },
      exclusions: {
        mediaTypes: [],
        sessionTypes: [],
        learningAreas: [],
        complexityMin: 0,
        complexityMax: 2,
      },
      now: NOW,
    });
    // Only the level-1 book is within [0, 2]; the level-5 book is filtered out.
    expect(suggestions.find(s => s.id === "resource-easy")).toBeDefined();
    expect(suggestions.find(s => s.id === "resource-hard")).toBeUndefined();
  });

  it("interleaves sections across bookmarks so one book doesn't dominate", () => {
    const suggestions = buildStartSuggestions({
      summary: summary({
        Reading: 0,
        Speaking: 9,
        Listening: 9,
        Writing: 9,
        Grammar: 9,
        Vocabulary: 9,
      }),
      areaTags: AREA_TAGS,
      resources: [
        res({
          id: "bookA",
          tagIds: ["t-reading"],
        }),
        res({
          id: "bookB",
          tagIds: ["t-reading"],
        }),
      ],
      sections: [
        sec("bookA", "a1"),
        sec("bookA", "a2"),
        sec("bookA", "a3"),
        sec("bookB", "b1"),
        sec("bookB", "b2"),
      ],
      now: NOW,
    });
    const content = suggestions.filter(s => s.id.startsWith("section-")).map(s => s.id);
    // Round-robin: A, B, A, B, A — never the same book twice in a row while the other has items left.
    expect(content.slice(0, 4)).toEqual(["section-a1", "section-b1", "section-a2", "section-b2"]);
  });

  it("prefers an actively-read resource over a finished one via content status", () => {
    const suggestions = buildStartSuggestions({
      summary: summary({
        Reading: 0,
        Speaking: 9,
        Listening: 9,
        Writing: 9,
        Grammar: 9,
        Vocabulary: 9,
      }),
      areaTags: AREA_TAGS,
      resources: [
        res({
          id: "done",
          contentStatus: "finished",
          tagIds: ["t-listening"],
        }),
        res({
          id: "active",
          contentStatus: "reading",
          tagIds: ["t-listening"],
        }),
      ],
      now: NOW,
    });
    const contentIds = suggestions.filter(s => s.id.startsWith("resource-")).map(s => s.id);
    expect(contentIds[0]).toBe("resource-active");
  });

  it("prefers an already-started resource (logged progress) over an untouched one", () => {
    const suggestions = buildStartSuggestions({
      summary: summary({
        Reading: 0,
        Speaking: 9,
        Listening: 9,
        Writing: 9,
        Grammar: 9,
        Vocabulary: 9,
      }),
      areaTags: AREA_TAGS,
      resources: [
        res({
          id: "fresh",
          tagIds: ["t-listening"],
        }),
        res({
          id: "started",
          tagIds: ["t-listening"],
          progress: {
            current: 5,
            total: 20,
            percent: 0.25,
            label: "5 of 20",
          },
        }),
      ],
      now: NOW,
    });
    const contentIds = suggestions.filter(s => s.id.startsWith("resource-")).map(s => s.id);
    expect(contentIds[0]).toBe("resource-started");
  });

  it("treats a resource with a completed section as started", () => {
    const suggestions = buildStartSuggestions({
      summary: summary({
        Reading: 0,
        Speaking: 9,
        Listening: 9,
        Writing: 9,
        Grammar: 9,
        Vocabulary: 9,
      }),
      areaTags: AREA_TAGS,
      resources: [
        res({
          id: "fresh",
          tagIds: ["t-reading"],
        }),
        res({
          id: "touched",
          tagIds: ["t-reading"],
        }),
      ],
      sections: [
        sec("fresh", "f1"),
        sec("touched", "t1", {
          completed: true,
        }),
      ],
      now: NOW,
    });
    const sectionIds = suggestions.filter(s => s.id.startsWith("section-")).map(s => s.id);
    expect(sectionIds[0]).toBe("section-t1");
  });
});

describe("retargetLineupItem", () => {
  const base: LineupItem = {
    id: "section-a1",
    kind: "area",
    area: "Reading",
    title: "Read \"Ch. 1\" of Book A",
    description: "Reading practice from your resources.",
    to: "/reading-sessions/new",
    search: {
      title: "Book A",
    },
    resourceId: "bookA",
    sectionId: "a1",
    done: false,
  };

  it("swaps to a different section of the same resource, keeping the activity", () => {
    const next = retargetLineupItem(
      base,
      res({
        id: "bookA",
        title: "Book A",
      }),
      sec("bookA", "a2", {
        label: "Ch. 2",
      }).section,
    );
    expect(next.id).toBe("section-a2");
    expect(next.title).toBe("Read \"Ch. 2\" of Book A");
    expect(next.sectionId).toBe("a2");
    expect(next.to).toBe("/reading-sessions/new");
    expect(next.area).toBe("Reading");
    expect(next.done).toBe(false);
  });

  it("changes to a whole different resource, clearing the section", () => {
    const next = retargetLineupItem(
      base,
      res({
        id: "bookB",
        title: "Book B",
      }),
      null,
    );
    expect(next.id).toBe("resource-bookB");
    expect(next.title).toBe("Read a bit of Book B");
    expect(next.resourceId).toBe("bookB");
    expect(next.sectionId).toBeUndefined();
  });
});

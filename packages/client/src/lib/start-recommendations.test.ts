import type { GrammarNote, QuestionSheet, XpSummary } from "@sentence-bank/types";

import { LEARNING_AREAS } from "@sentence-bank/types";
import { describe, expect, it } from "vitest";

import { buildStartSuggestions, lowestXpArea } from "./start-recommendations";

const NOW = new Date("2026-07-20T12:00:00Z");

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

  it("suggests the lowest area with a concrete section when one is tagged", () => {
    const suggestions = buildStartSuggestions({
      summary: summary({
        Listening: 3,
        Reading: 3,
        Writing: 3,
        Grammar: 3,
        Vocabulary: 3,
      }),
      lowestAreaSections: [
        {
          bookmarkId: "b1",
          bookmarkTitle: "Terrace House",
          bookmarkUrl: "https://example.com/th",
          imageUrl: null,
          mediaType: "Video",
          tagIds: [],
          section: {
            id: "s1",
            label: "Ep. 3 › 12:00–14:30",
            type: "timestamp",
            startValue: "12:00",
            endValue: "14:30",
          },
        },
      ],
      now: NOW,
    });
    const area = suggestions.find(s => s.kind === "area");
    expect(area?.area).toBe("Speaking");
    expect(area?.title).toContain("Ep. 3");
    expect(area?.to).toBe("/shadowing/new");
    expect(area?.search).toMatchObject({
      bookmarkId: "b1",
    });
  });

  it("falls back to the bare session link when no sections or resources match", () => {
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
    const area = suggestions.find(s => s.kind === "area");
    expect(area?.area).toBe("Listening");
    expect(area?.to).toBe("/listening-sessions/new");
    expect(area?.search).toBeUndefined();
  });

  it("always surfaces a starred grammar point", () => {
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
    const starred = suggestions.find(s => s.kind === "starred-grammar");
    expect(starred).toBeDefined();
    expect(starred?.params?.id).toBe("n-starred");
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

  it("filters excluded media types out of the section pool", () => {
    const section = (id: string, mediaType: string) => ({
      bookmarkId: id,
      bookmarkTitle: `Resource ${id}`,
      bookmarkUrl: null,
      imageUrl: null,
      mediaType,
      tagIds: [],
      section: {
        id: `${id}-s`,
        label: `Section of ${id}`,
        type: "page" as const,
        startValue: null,
        endValue: null,
      },
    });
    const suggestions = buildStartSuggestions({
      summary: summary({
        Listening: 0,
        Speaking: 9,
        Reading: 9,
        Writing: 9,
        Grammar: 9,
        Vocabulary: 9,
      }),
      lowestAreaSections: [section("book", "Book"), section("video", "Video")],
      exclusions: {
        mediaTypes: ["Book"],
        sessionTypes: [],
        learningAreas: [],
      },
      now: NOW,
    });
    const area = suggestions.find(s => s.kind === "area");
    expect(area?.search?.bookmarkId).toBe("video");
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

  it("floats favorited resources to the front of the pick pool", () => {
    const resource = (id: string, favorite = false) => ({
      id,
      title: `Resource ${id}`,
      url: null,
      website: null,
      runtimeSeconds: 60,
      mediaType: "Video",
      complexity: null,
      progress: null,
      favorite,
      contentStatus: null,
      tagIds: [],
      imageUrl: null,
    });
    const base = {
      summary: summary({
        Listening: 0,
        Speaking: 9,
        Reading: 9,
        Writing: 9,
        Grammar: 9,
        Vocabulary: 9,
      }),
      now: NOW,
    };
    // A locally-starred resource beats list order…
    const local = buildStartSuggestions({
      ...base,
      lowestAreaResources: [resource("first"), resource("starred")],
      favoriteResourceIds: ["starred"],
    });
    expect(local.find(s => s.kind === "area")?.search?.bookmarkId).toBe("starred");
    // …and an upstream favorite beats a plain resource when nothing is starred locally.
    const upstream = buildStartSuggestions({
      ...base,
      lowestAreaResources: [resource("plain"), resource("host-fav", true)],
    });
    expect(upstream.find(s => s.kind === "area")?.search?.bookmarkId).toBe("host-fav");
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
    const goal = suggestions.find(s => s.kind === "goal");
    expect(goal?.params?.id).toBe("n-goal");
    expect(goal?.description).toContain("Master particles");
  });
});

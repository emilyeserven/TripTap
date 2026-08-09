// @vitest-environment node
import type { CultureItem, CultureNote, WithAiLesson } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import type { CultureFilters } from "./culture-filter";

import { filterAiLessonCulture, filterCultureNotes } from "./culture-filter";

const ALL: CultureFilters = {
  search: "",
  scope: "all",
  aiLesson: "all",
  topic: "all",
};

// Fixtures only carry the fields the filters read; the full wire types are much wider.
function note(over: {
  id: string;
  titleJp?: string | null;
  titleEn?: string | null;
  bodyJa?: string | null;
  bodyEn?: string | null;
  topicIds?: string[];
}): CultureNote {
  return {
    titleJp: null,
    titleEn: null,
    bodyJa: null,
    bodyEn: null,
    topicIds: [],
    ...over,
  } as unknown as CultureNote;
}

function lessonCard(over: {
  id: string;
  jp: string;
  en?: string;
  body?: string;
  aiLessonSlug?: string;
  topicIds?: string[] | null;
}): WithAiLesson<CultureItem> {
  return {
    en: "",
    body: "",
    aiLessonSlug: "lesson-1",
    topicIds: null,
    ...over,
  } as unknown as WithAiLesson<CultureItem>;
}

const notes = [
  note({
    id: "n1",
    bodyJa: "麺をすするのは失礼ではありません。",
    topicIds: ["t-food"],
  }),
  note({
    id: "n2",
    titleEn: "Shoes off",
    bodyEn: "Take your shoes off in the genkan.",
  }),
];
const cards = [
  lessonCard({
    id: "c1",
    jp: "お辞儀",
    body: "Bowing depth signals formality.",
    topicIds: ["t-etiquette"],
  }),
  lessonCard({
    id: "c2",
    jp: "屋台",
    aiLessonSlug: "lesson-2",
  }),
];

describe("filterCultureNotes", () => {
  it("shows all notes with the default filters", () => {
    expect(filterCultureNotes(notes, ALL).map(n => n.id)).toEqual(["n1", "n2"]);
  });

  it("hides notes when the scope is lessons", () => {
    expect(filterCultureNotes(notes, {
      ...ALL,
      scope: "lessons",
    })).toEqual([]);
  });

  it("hides notes when narrowed to one AI Lesson, unless the scope is yours", () => {
    const narrowed = {
      ...ALL,
      aiLesson: "lesson-1",
    };
    expect(filterCultureNotes(notes, narrowed)).toEqual([]);
    expect(filterCultureNotes(notes, {
      ...narrowed,
      scope: "yours",
    }).length).toBe(2);
  });

  it("filters by topic id", () => {
    expect(filterCultureNotes(notes, {
      ...ALL,
      topic: "t-food",
    }).map(n => n.id)).toEqual(["n1"]);
  });

  it("matches the search against titles and both bodies", () => {
    expect(filterCultureNotes(notes, {
      ...ALL,
      search: "genkan",
    }).map(n => n.id)).toEqual(["n2"]);
    expect(filterCultureNotes(notes, {
      ...ALL,
      search: "麺",
    }).map(n => n.id)).toEqual(["n1"]);
  });
});

describe("filterAiLessonCulture", () => {
  it("shows all cards with the default filters", () => {
    expect(filterAiLessonCulture(cards, ALL).map(c => c.id)).toEqual(["c1", "c2"]);
  });

  it("hides cards when the scope is yours", () => {
    expect(filterAiLessonCulture(cards, {
      ...ALL,
      scope: "yours",
    })).toEqual([]);
  });

  it("narrows to one AI Lesson", () => {
    expect(filterAiLessonCulture(cards, {
      ...ALL,
      aiLesson: "lesson-2",
    }).map(c => c.id)).toEqual(["c2"]);
  });

  it("filters by topic id, treating never-tagged (null) as no topics", () => {
    expect(filterAiLessonCulture(cards, {
      ...ALL,
      topic: "t-etiquette",
    }).map(c => c.id)).toEqual(["c1"]);
    expect(filterAiLessonCulture(cards, {
      ...ALL,
      topic: "t-food",
    })).toEqual([]);
  });

  it("matches the search against headings and body", () => {
    expect(filterAiLessonCulture(cards, {
      ...ALL,
      search: "bowing",
    }).map(c => c.id)).toEqual(["c1"]);
  });
});

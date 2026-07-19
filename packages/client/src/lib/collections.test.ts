import type { BookmarkResource, ComplexityScale, LearningAreaTagMap } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import {
  ALL_FILTER,
  complexityLevelOptions,
  formatComplexity,
  formatRuntime,
  hasRuntime,
  learningAreaFilterOptions,
  matchesComplexity,
  matchesLearningAreas,
  matchesMediaType,
  mediaTypeFilterOptions,
  matchesWebsite,
  resourceActions,
  resourceLearningAreas,
  sortByRuntime,
  websiteFilterOptions,
} from "./collections";

function resource(over: Partial<BookmarkResource>): BookmarkResource {
  return {
    id: "x",
    title: "t",
    url: null,
    website: null,
    runtimeSeconds: null,
    mediaType: null,
    complexity: null,
    tagIds: [],
    imageUrl: null,
    ...over,
  };
}

const SCALE: ComplexityScale = {
  max: 5,
  labels: {
    0: "Absolute Beginner",
    1: "Beginner",
    2: "Intermediate-Beginner",
    3: "Intermediate",
    4: "Advanced-Intermediate",
    5: "Advanced",
  },
};

const yt = resource({
  id: "a",
  website: {
    domain: "youtube.com",
    siteName: "YouTube",
  },
  runtimeSeconds: 100,
});
const nf = resource({
  id: "b",
  website: {
    domain: "netflix.com",
    siteName: "Netflix",
  },
  runtimeSeconds: 50,
});
const noRuntime = resource({
  id: "c",
  website: {
    domain: "youtube.com",
    siteName: "YouTube",
  },
  runtimeSeconds: null,
});

describe("websiteFilterOptions", () => {
  it("dedupes and alphabetizes site names with an All option first", () => {
    expect(websiteFilterOptions([yt, nf, noRuntime])).toEqual([
      {
        value: ALL_FILTER,
        label: "All websites",
      },
      {
        value: "Netflix",
        label: "Netflix",
      },
      {
        value: "YouTube",
        label: "YouTube",
      },
    ]);
  });
});

describe("matchesWebsite", () => {
  it("passes everything for ALL_FILTER and matches by site name otherwise", () => {
    expect(matchesWebsite(yt, ALL_FILTER)).toBe(true);
    expect(matchesWebsite(yt, "YouTube")).toBe(true);
    expect(matchesWebsite(yt, "Netflix")).toBe(false);
  });
});

describe("sortByRuntime", () => {
  it("sorts ascending/descending with null runtimes always last", () => {
    expect(sortByRuntime([yt, nf, noRuntime], "asc").map(r => r.id)).toEqual(["b", "a", "c"]);
    expect(sortByRuntime([yt, nf, noRuntime], "desc").map(r => r.id)).toEqual(["a", "b", "c"]);
  });
});

describe("formatRuntime", () => {
  it("formats seconds as M:SS or H:MM:SS, and null as a dash", () => {
    expect(formatRuntime(50)).toBe("0:50");
    expect(formatRuntime(1652)).toBe("27:32");
    expect(formatRuntime(3661)).toBe("1:01:01");
    expect(formatRuntime(null)).toBe("—");
  });
});

describe("mediaTypeFilterOptions / matchesMediaType", () => {
  const video = resource({
    id: "a",
    mediaType: "Video",
  });
  const book = resource({
    id: "b",
    mediaType: "Book",
  });
  const none = resource({
    id: "c",
    mediaType: null,
  });

  it("dedupes and alphabetizes media types with an All option first", () => {
    expect(mediaTypeFilterOptions([video, book, none, video])).toEqual([
      {
        value: ALL_FILTER,
        label: "All media types",
      },
      {
        value: "Book",
        label: "Book",
      },
      {
        value: "Video",
        label: "Video",
      },
    ]);
  });

  it("passes everything for ALL_FILTER and matches by name otherwise", () => {
    expect(matchesMediaType(video, ALL_FILTER)).toBe(true);
    expect(matchesMediaType(video, "Video")).toBe(true);
    expect(matchesMediaType(book, "Video")).toBe(false);
  });
});

describe("hasRuntime", () => {
  it("is true only when the resource has a runtime", () => {
    expect(hasRuntime(resource({
      runtimeSeconds: 10,
    }))).toBe(true);
    expect(hasRuntime(resource({
      runtimeSeconds: null,
    }))).toBe(false);
  });
});

describe("complexityLevelOptions", () => {
  it("lists every level 0..max with its label", () => {
    expect(complexityLevelOptions(SCALE)).toEqual([
      {
        value: 0,
        label: "Absolute Beginner",
      },
      {
        value: 1,
        label: "Beginner",
      },
      {
        value: 2,
        label: "Intermediate-Beginner",
      },
      {
        value: 3,
        label: "Intermediate",
      },
      {
        value: 4,
        label: "Advanced-Intermediate",
      },
      {
        value: 5,
        label: "Advanced",
      },
    ]);
  });

  it("falls back to a generic label when one is missing", () => {
    expect(complexityLevelOptions({
      max: 1,
      labels: {},
    })).toEqual([
      {
        value: 0,
        label: "Level 0",
      },
      {
        value: 1,
        label: "Level 1",
      },
    ]);
  });
});

describe("matchesComplexity", () => {
  const beginner = resource({
    complexity: {
      min: 1,
      max: 1,
    },
  });
  const spread = resource({
    complexity: {
      min: 2,
      max: 4,
    },
  });
  const unset = resource({
    complexity: null,
  });

  it("passes everything (incl. unset) when the window is the full scale", () => {
    expect(matchesComplexity(unset, 0, 5, SCALE)).toBe(true);
    expect(matchesComplexity(beginner, 0, 5, SCALE)).toBe(true);
  });

  it("excludes unset resources once the window is narrowed", () => {
    expect(matchesComplexity(unset, 1, 5, SCALE)).toBe(false);
  });

  it("keeps resources whose band overlaps the window", () => {
    expect(matchesComplexity(beginner, 1, 2, SCALE)).toBe(true);
    expect(matchesComplexity(beginner, 3, 5, SCALE)).toBe(false);
    expect(matchesComplexity(spread, 4, 5, SCALE)).toBe(true); // 2..4 overlaps 4..5
    expect(matchesComplexity(spread, 0, 1, SCALE)).toBe(false); // 2..4 vs 0..1
  });

  it("passes everything when there is no scale", () => {
    expect(matchesComplexity(unset, 2, 3, null)).toBe(true);
  });
});

describe("formatComplexity", () => {
  it("labels a single level and a range, and is empty when unset", () => {
    expect(formatComplexity(resource({
      complexity: {
        min: 1,
        max: 1,
      },
    }), SCALE)).toBe("Beginner");
    expect(formatComplexity(resource({
      complexity: {
        min: 1,
        max: 3,
      },
    }), SCALE)).toBe("Beginner–Intermediate");
    expect(formatComplexity(resource({
      complexity: null,
    }), SCALE)).toBe("");
  });
});

const AREA_MAP: LearningAreaTagMap = {
  Listening: {
    id: "tL",
    name: "Listening",
  },
  Speaking: {
    id: "tS",
    name: "Speaking",
  },
  Reading: {
    id: "tR",
    name: "Reading",
  },
  Writing: {
    id: "tW",
    name: "Writing",
  },
};

describe("resourceLearningAreas", () => {
  it("returns the mapped areas whose tag is on the resource, in canonical order", () => {
    expect(resourceLearningAreas(["tR", "tL"], AREA_MAP)).toEqual(["Listening", "Reading"]);
    expect(resourceLearningAreas(["nope"], AREA_MAP)).toEqual([]);
    expect(resourceLearningAreas(["tL"], {})).toEqual([]);
  });
});

describe("learningAreaFilterOptions", () => {
  it("lists only mapped areas as options", () => {
    expect(learningAreaFilterOptions({
      Listening: {
        id: "tL",
        name: "L",
      },
      Reading: {
        id: "tR",
        name: "R",
      },
    })).toEqual([
      {
        value: "Listening",
        label: "Listening",
      },
      {
        value: "Reading",
        label: "Reading",
      },
    ]);
  });
});

describe("matchesLearningAreas", () => {
  it("passes everything when nothing is selected, else matches ANY selected area", () => {
    const r = resource({
      tagIds: ["tL"],
    });
    expect(matchesLearningAreas(r, [], AREA_MAP)).toBe(true);
    expect(matchesLearningAreas(r, ["Listening"], AREA_MAP)).toBe(true);
    expect(matchesLearningAreas(r, ["Reading", "Listening"], AREA_MAP)).toBe(true);
    expect(matchesLearningAreas(r, ["Reading"], AREA_MAP)).toBe(false);
  });
});

describe("resourceActions", () => {
  it("derives session buttons from the resource's learning areas", () => {
    expect(resourceActions(resource({
      tagIds: ["tL", "tW"],
    }), AREA_MAP)).toEqual(["listening", "writing"]);
    expect(resourceActions(resource({
      tagIds: ["tS"],
    }), AREA_MAP)).toEqual(["shadowing"]);
  });

  it("falls back to the runtime heuristic when no area maps to an action", () => {
    expect(resourceActions(resource({
      tagIds: [],
      runtimeSeconds: 120,
    }), AREA_MAP)).toEqual(["listening", "shadowing"]);
    expect(resourceActions(resource({
      tagIds: [],
      runtimeSeconds: null,
    }), AREA_MAP)).toEqual(["reading", "writing"]);
  });
});
